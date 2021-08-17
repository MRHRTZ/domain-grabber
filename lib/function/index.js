const cheerio = require('cheerio')
const {
    default: Axios
} = require('axios')
const fs = require('fs')
const moment = require('moment');
const {
    connected
} = require('process');
const io = require('socket.io')(2021);
const chalk = require('chalk')

let soft_exit = {
    status: true,
    domain: [],
    filename: '',
    filetype: ''
} 
io.on('connection', (socket) => {
    const BASE_URL = 'https://www.dubdomain.com/new-domain-registered-dates/'


    socket.emit('conn', {
        status: true,
        message: connected,
        date: new Date()
    })

    socket.on('exit', () => {
        if (soft_exit.status) {
            console.log(chalk.redBright('Goodbye!'))
            process.exit(0)
        } else {
            console.log(chalk.redBright('Exiting...'))
            const output = './dumpfile/' + soft_exit.filename
            fs.writeFileSync('./dumpfile/' + soft_exit.filename, soft_exit.filetype == 'JSON' ? JSON.stringify(soft_exit.domain, null, 5) : soft_exit.domain.join('\n'))
            soft_exit.status = true
            console.log(chalk.yellow(`[ Dump success ${output} ]`));
            process.exit(0)
        }
    })

    socket.on('action', (json) => {
        // console.log('3x3cuting action7.');
        var {
            page,
            date,
            filename,
            filetype
        } = json
        if (filetype == 'RAW') {
            filename = filename.includes('.txt') ? filename : filename + '.txt'
        } else {
            filename = filename.includes('.json') ? filename : filename + '.json'
        }
        soft_exit.filename = filename
        soft_exit.filetype = filetype

        if (page == 'all') {
            Axios.get(BASE_URL + moment(date).format('YYYY-MM-DD') + `/${page}`)
                .then(async ({
                    data
                }) => {
                    const $ = cheerio.load(data)
                    const page = $('div.text-center > ul > li.page-item > a.page-link.disabled').attr('href').split('/')[3]
                    if (isNaN(Number(page))) {
                        socket.emit('problem', {
                            status: false,
                            message: 'No domain registered '
                        })
                    } else {
                        try {
                            const total = $('section.box > ul.list-inline.m-0 > li').text().split(':')[1].replace(/ /g, '')
                            let domains = []
                            for (let i = 1; i <= page; i++) {
                                soft_exit.status = false
                                let domenNow = []
                                const rawPromise = await Axios.get(BASE_URL + moment(date).format('YYYY-MM-DD') + `/${i}`)
                                const $$ = cheerio.load(rawPromise.data)
                                $$('div.row > div.col-md-4 > a').get().map(rest => {
                                    const domen = $(rest).text()
                                    soft_exit.domain.push(domen)
                                    domains.push(domen)
                                    domenNow.push(domen)
                                })
                                socket.emit('success', {
                                    domenNow,
                                    domains,
                                    debug: 'get-data',
                                    page: `${i}/${page}`,
                                    length: domains.length
                                })
                            }
                            const output = './dumpfile/' + filename
                            fs.writeFileSync('./dumpfile/' + filename, filetype == 'JSON' ? JSON.stringify(domains, null, 5) : domains.join('\n'))
                            const result = {
                                status: true,
                                total,
                                domains,
                                output
                            }
                            soft_exit.status = true
                            socket.emit('success', result)
                        } catch (e) {
                            socket.emit('problem', {
                                status: false,
                                message: e.message
                            })
                        }
                    }
                })
                .catch(e => socket.emit('problem', {
                    status: false,
                    message: e.message
                }))
        } else {
            const child_url = BASE_URL + moment(date).format('YYYY-MM-DD') + `/${page}`
            Axios.get(child_url)
                .then(({
                    data
                }) => {
                    const $ = cheerio.load(data)
                    const total = $('section.box > ul.list-inline.m-0 > li').text().split(':')[1].replace(/ /g, '')
                    let domains = []
                    const page = $('div.text-center > ul > li.page-item > a.page-link.disabled').attr('href').split('/')[3]
                    $('div.row > div.col-md-4 > a').get().map(rest => {
                        domains.push($(rest).text())
                        soft_exit.domain.push($(rest).text())
                    })
                    let result = {
                        total,
                        totalPage: page,
                        domains,
                        debug: 'get-data-once'
                    }
                    if (total == 0) {
                        socket.emit('problem', {
                            ...result,
                            message: 'Tidak ada domain tersedia'
                        })
                    } else {
                        const output = './dumpfile/' + filename
                        fs.writeFileSync('./dumpfile/' + filename, filetype == 'JSON' ? JSON.stringify(domains, null, 5) : domains.join('\n'))
                        socket.emit('success', result)
                        socket.emit('success', {
                            status: true,
                            output
                        })
                    }
                })
                .catch(e => socket.emit('problem', {
                    status: false,
                    message: e.message
                }))
        }

    })
})

/*
function getDomain({
    date,
    page
}) {
    return new Promise((resolve, reject) => {

    })
}

getDomain({
        date: new Date('2021-08-15T00:29:01.719Z'),
        page: 'all'
    })
    .then(console.log)
    .catch(console.log)



new Date('2021-08-15T00:29:01.719Z')

<ul class="list-inline m-0">
                    <li class=list-inline-item><strong>Total domains registered on 15 August 2021:</strong> 135144
                </ul>

*/