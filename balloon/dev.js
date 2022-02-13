const budo = require('budo')
const argv = require('minimist')(process.argv.slice(2))
const path = require('path')
const babelify = require('babelify')
const open = require('opn')
const fs = require('fs')
const simpleHtml = require('simple-html-index')

var entry = argv._[0]
if (!entry) {
  entry = 'default.png'
}
const entryFilename = "balloon.js"

const entryFile = path.resolve(__dirname, entryFilename)
budo(entryFile, {
  serve: 'static/S_balloon.js',
  live: true,
  verbose: true,
  dir: __dirname,
  stream: process.stdout,
  forceDefaultIndex: true,
  defaultIndex: function (opt) {
    var html = 'balloon.html'
    if (!fs.existsSync(html)) return simpleHtml(opt)
    return fs.createReadStream(html)
  },
  browserify: {
    debug: false,
    transform: [
      babelify.configure({ presets: ['es2015'] }),
      [ 'installify', { save: true } ]
    ]
  }
}).on('connect', function (ev) {
  if (argv.open) open(ev.uri)
})
