// Конфигурация приложения
const config = {
    workshopsCount: 20,
    indicators: [
        'Выпуск', 'Брак', 'Простой', 'Численность', 
        'Изготовлено', 'ПроцентОтПлана', 'Себестоимость',
        'ВаловаяПрибыль', 'Маржинальность', 'EBITDA',
        'Рентабельность', 'ЧистаяПрибыль'
    ],
    months: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 
             'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    quarters: {
        'Q1': ['Янв', 'Фев', 'Мар'],
        'Q2': ['Апр', 'Май', 'Июн'],
        'Q3': ['Июл', 'Авг', 'Сен'],
        'Q4': ['Окт', 'Ноя', 'Дек']
    }
};

// Цветовая палитра для 20 цехов
const colors = [
    "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099",
    "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395",
    "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300",
    "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"
];

// Хранение данных приложения
let appData = {
    rawData: [],
    workshops: [],
    monthlyData: {},
    quarterlyData: {},
    annualData: {},
    lastUploadedFile: null
};
// Инициализация приложения
function initApp() {
    setupFileUpload();
    setupUI();
    loadInitialData();
    setupEventListeners();
}

// Настройка загрузки файлов
function setupFileUpload() {
    const fileInput = document.getElementById('csvUpload');
    const fileNameDisplay = document.getElementById('fileName');
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        fileNameDisplay.textContent = `Выбран файл: ${file.name}`;
        appData.lastUploadedFile = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const data = parseCSV(csvText);
                if (data.length === 0) throw new Error("Файл не содержит данных");
                
                appData.rawData = data;
                processData(data);
                saveData();
                updateUI();
            } catch (error) {
                console.error("Ошибка обработки файла:", error);
                alert(`Ошибка: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
}

// Парсинг CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Цех', 'Месяц', 'Выпуск', 'Брак', 'Простой'];
    
    if (!requiredHeaders.every(h => headers.includes(h))) {
        throw new Error("CSV файл должен содержать обязательные колонки: Цех, Месяц, Выпуск, Брак, Простой");
    }
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            let value = values[index] ? values[index].trim() : '';
            
            // Преобразование числовых значений
            if (header !== 'Цех' && header !== 'Месяц' && !isNaN(value)) {
                value = parseFloat(value);
            }
            
            obj[header] = value;
            return obj;
        }, {});
    }).filter(row => row['Цех'] && row['Месяц']);
}
// Основная обработка данных
function processData(data) {
    try {
        // Группировка данных по цехам и месяцам
        appData.workshops = [...new Set(data.map(row => parseInt(row['Цех'])))].sort((a, b) => a - b);
        appData.monthlyData = {};
        
        // Заполнение месячных данных
        appData.workshops.forEach(workshop => {
            appData.monthlyData[workshop] = {};
            config.months.forEach(month => {
                const monthData = data.filter(row => 
                    parseInt(row['Цех']) === workshop && row['Месяц'] === month
                )[0] || {};
                
                appData.monthlyData[workshop][month] = monthData;
            });
        });
        
        // Расчет квартальных данных
        calculateQuarterlyData();
        
        // Расчет годовых данных
        calculateAnnualData();
        
    } catch (error) {
        console.error("Ошибка обработки данных:", error);
        throw new Error("Не удалось обработать данные");
    }
}

// Расчет квартальных показателей
function calculateQuarterlyData() {
    appData.quarterlyData = {};
    
    Object.entries(config.quarters).forEach(([quarter, months]) => {
        appData.quarterlyData[quarter] = {};
        
        appData.workshops.forEach(workshop => {
            const quarterData = {
                'Выпуск': 0,
                'Брак': 0,
                'Простой': 0,
                'Численность': 0,
                'Изготовлено': 0,
                'Себестоимость': 0,
                'ВаловаяПрибыль': 0,
                'EBITDA': 0,
                'ЧистаяПрибыль': 0
            };
            
            let monthCount = 0;
            months.forEach(month => {
                const monthData = appData.monthlyData[workshop][month];
                if (monthData && monthData['Выпуск']) {
                    config.indicators.forEach(indicator => {
                        if (quarterData.hasOwnProperty(indicator) && monthData[indicator]) {
                            quarterData[indicator] += parseFloat(monthData[indicator]) || 0;
                        }
                    });
                    monthCount++;
                }
            });
            
            // Расчет средних значений
            if (monthCount > 0) {
                ['Брак', 'Простой', 'ПроцентОтПлана', 'Маржинальность', 'Рентабельность'].forEach(indicator => {
                    if (quarterData.hasOwnProperty(indicator)) {
                        quarterData[indicator] = quarterData[indicator] / monthCount;
                    }
                });
            }
            
            appData.quarterlyData[quarter][workshop] = quarterData;
        });
    });
}
// Отрисовка графиков
function renderCharts() {
    renderWorkshopCharts();
    renderMonthCharts();
    renderQuarterlyReports();
    renderAnnualReports();
}

// Графики по цехам
function renderWorkshopCharts() {
    const container = document.getElementById('workshopCharts');
    if (!container) return;
    
    container.innerHTML = '';
    const workshopSelect = document.getElementById('workshopSelect');
    if (!workshopSelect) return;
    
    // Заполнение выпадающего списка цехов
    workshopSelect.innerHTML = '';
    appData.workshops.forEach(workshop => {
        const option = document.createElement('option');
        option.value = workshop;
        option.textContent = `Цех ${workshop}`;
        workshopSelect.appendChild(option);
    });
    
    // Отрисовка графиков для первого цеха
    if (appData.workshops.length > 0) {
        updateWorkshopCharts(appData.workshops[0]);
    }
    
    // Обработчик изменения выбора цеха
    workshopSelect.addEventListener('change', (e) => {
        updateWorkshopCharts(parseInt(e.target.value));
    });
}

// Обновление графиков для конкретного цеха
function updateWorkshopCharts(workshopId) {
    const container = document.getElementById('workshopCharts');
    if (!container || !appData.monthlyData[workshopId]) return;
    
    container.innerHTML = '';
    
    // Создаем графики для каждого показателя
    config.indicators.forEach(indicator => {
        const chartData = {
            labels: config.months,
            datasets: [{
                label: indicator,
                data: config.months.map(month => 
                    appData.monthlyData[workshopId][month][indicator] || 0
                ),
                backgroundColor: colors[workshopId % colors.length],
                borderColor: colors[workshopId % colors.length],
                borderWidth: 1
            }]
        };
        
        const canvas = document.createElement('canvas');
        canvas.height = 300;
        container.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: getChartOptions(`Цех ${workshopId}: ${indicator}`)
        });
    });
}

// Настройки графиков
function getChartOptions(title) {
    return {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: title,
                font: { size: 16 }
            },
            legend: { display: false }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };
}
// Экспорт в PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Титульная страница
    doc.setFontSize(22);
    doc.text('Производственный отчет', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Дата формирования: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    
    // Добавляем графики и таблицы
    addChartsToPDF(doc);
    addTablesToPDF(doc);
    
    // Сохраняем PDF
    doc.save(`production_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

// Сохранение данных в localStorage
function saveData() {
    try {
        localStorage.setItem('productionData', JSON.stringify({
            rawData: appData.rawData,
            lastUploadedFile: appData.lastUploadedFile
        }));
    } catch (error) {
        console.error("Ошибка сохранения данных:", error);
    }
}

// Загрузка сохраненных данных
function loadSavedData() {
    try {
        const savedData = localStorage.getItem('productionData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            appData.rawData = parsedData.rawData;
            appData.lastUploadedFile = parsedData.lastUploadedFile;
            
            if (appData.rawData.length > 0) {
                processData(appData.rawData);
                updateUI();
                alert(`Данные успешно загружены из ${appData.lastUploadedFile || 'сохраненной версии'}`);
            }
        } else {
            alert("Нет сохраненных данных");
        }
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        alert("Ошибка при загрузке сохраненных данных");
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверка загрузки библиотек
    if (typeof Chart === 'undefined' || typeof jsPDF === 'undefined') {
        alert("Ошибка: Не загружены необходимые библиотеки!");
        return;
    }
    
    initApp();
});
