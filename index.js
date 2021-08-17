require('./lib/function')
const inquirer = require('inquirer')
const date_input = require('inquirer-datepicker-prompt')
const figlet = require('figlet')
const chalk = require('chalk')
inquirer.registerPrompt('datetime', date_input)

if (process.platform === "win32") {
    var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on("SIGINT", function () {
        process.emit("SIGINT");
    });
}

// console.log('start')
var io = require('socket.io-client');
var socket = io.connect('http://localhost:2021', {
    reconnect: true
});

let isConnected = false
// Add a connect listener
socket.on('connect', function (socket) {
    //console.log('Connected!\n');
    isConnected = true
});

process.on('SIGINT', function() {
    if (isConnected) {
        socket.emit('exit', {})
    } else {
        console.log(chalk.redBright('Goodbye!'))
        process.exit(0)
    }
});

//const BASE_URL = 'https://www.dubdomain.com/new-domain-registered-dates/'

const questions = [{
    type: 'datetime',
    name: 'date',
    message: 'Grab domain pada tanggal?',
    format: ['dd', '/', 'mm', '/', 'yyyy', ' ', 'hh', ':', 'MM', ' ', 'TT']
}, {
    type: 'input',
    name: 'page',
    message: 'Masukan page, atau masukan all untuk grab semua page',
    default () {
        return 'all';
    },
}, {
    type: 'input',
    name: 'filename',
    message: 'Masukan nama file',
    default () {
        return `${new Date().valueOf()}-dump.txt`;
    }
}, {
    type: 'list',
    name: 'filetype',
    message: 'Type bentuk dump',
    choices: [ "RAW", "JSON" ]
}]

function menu() {
    console.clear()
    figlet.text('Domain Grabber', {
        font: 'Ghost',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
    }, function(err, data) {
        if (err) {
            console.log('Something went wrong...');
            console.dir(err);
            return;
        }
        console.log(chalk.green(data + '\n\n                            ' + chalk.blue('[ By MRHRTZ ]\n\n')));
        inquirer.prompt(questions).then((answers) => {
            socket.emit('action', {
                page: answers.page,
                date: answers.date,
                filename: answers.filename,
                filetype: answers.filetype
            });
        });
    });
}

function backOrExit(msg) {
    inquirer.prompt([{
        type: 'confirm',
        name: 'back',
        message: `[ ${msg} ] Kembali ke menu?`
    }]).then(json => {
        // console.log(json);
        if (json.back) {
            menu()
        } else {
            process.exit(0)
        }
    })
}

socket.on('success', (json) => {
    //console.log(json);
    if (json.status) {
        // console.log('Sukses dump');
        backOrExit(chalk.cyanBright('Sukses dump ' + json.output))
    } else if (json.debug == 'get-data') {
        for (let i = 0; i < json.domenNow.length; i++) {
            console.log(`${chalk.greenBright(`[ ${new Date().toJSON()} ]`)} (${chalk.blueBright(json.page) + ') ' + chalk.yellowBright(i + json.domains.length) + chalk.redBright(' -')} ${chalk.white(json.domenNow[i])}`)
        }
    } else if (json.debug == 'get-data-once') {
        for (let i = 0; i < json.domains.length; i++) {
            console.log(`${chalk.greenBright(`[ ${new Date().toJSON()} ]`)} ${chalk.yellowBright(i) + chalk.redBright(' -')} ${chalk.white(json.domains[i])}`)
        }
    }
})

socket.on('problem', (json) => {
    // console.log(json);
    backOrExit(chalk.cyanBright(json.message))
})



menu()

