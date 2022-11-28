#!/usr/bin/env node
console.log('test lib/index.js')
const { src, dest, series, parallel, watch} = require('gulp')

// 拿到当前执行的根目录
const cwd = process.cwd()
// console.log(cwd)
let config = {
    // default config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**'
        }
    }
}
console.log('loadconfig')
try {
    const loadconfig = require(`${cwd}/hhl-pages-config.js`)
    config = Object.assign({}, config, loadconfig)
}catch(e) {
    console.log(e)
}

// ?
const sass = require('gulp-sass')(require('sass'))
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const imagemin = require('gulp-imagemin')

// gulp 的插件则不需要引入，但需要安装
const gulpLoadPlugins = require('gulp-load-plugins')
const plugins = gulpLoadPlugins()
const del = require('del')

// 非gulp 插件，需要单独引入
const browserSync = require('browser-sync')
// 自动 创建 一个服务器,不是初始化
const bs = browserSync.create()

/*---------   0、 清除 ----------*/
const clean = () => {
    return del([config.build.dist, config.build.temp])
}

/*---------   1、 编译 ----------*/

// 1、样式文件复制到dist 2、sass加工后放入
const style = () => {
    console.log('css change---')
    // 不增加 option: base 配置基本根目录，则会直接输出到dest指定的目录
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src})
        .pipe(sass())
        .pipe(dest(config.build.temp))
}

// 1、js文件复制到dist 3、 babel加工后放入
const scripts = () => {
    console.log('js change----')
    // 不增加 option: base 配置基本根目录，则会直接输出到dest指定的目录
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src})
        // .pipe(plugins.babel({presets: ['@babel/preset-env']}))
        .pipe(plugins.babel({presets: [require('@babel/preset-env')]}))
        .pipe(dest(config.build.temp))
}

// 模版文件复制到dist
const html = () => {
    console.log('html change----')
    // 需要匹配src 所有的文件夹下的文件：src/**/*.js
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src})
        // defaults: {cache: false} 清理swig自带的模版缓存
        .pipe(plugins.swig({data: config.data, defaults: {cache: false}})) 
        .pipe(dest(config.build.temp))
}

// 图片文件复制到dist
const images = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// 字体文件复制到dist
const fonts = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// 其他编译
const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

/*---------   2、 开发预览、监控文件变化 ----------*/

// 启动一个服务器的gulp 任务
const serve = (done) => {

    // 1、通过gulp自带的 watch 监控 开发环境文件的变化,在第二个参数传入 当有变化时需要做的事
    watch(config.build.paths.styles, {cwd: config.build.src} ,style)
    watch(config.build.paths.scripts, {cwd: config.build.src}, scripts)
    watch(config.build.paths.pages, {cwd: config.build.src},html)
    
    // 图片有变化，不做编译
    watch([
        config.build.paths.images,
        config.build.paths.fonts
      ], { cwd: config.build.src }, bs.reload)
    watch('**', { cwd: config.build.public }, bs.reload)
    // watch([
    //     'src/assets/images/**',
    //     'src/assets/fonts/**',
    //     'public/**'
    //     ], bs.reload)
    // 2、配置服务,并启动服务
    bs.init({
        files: 'temp/**', // 服务启动后，这里的文件更新后会自动更新
        // open: false,
        port: 2080,
        server: {
            // 当有请求，会先去第一个文件夹找，找不到再到下一个，提高构建效率
            baseDir: [config.build.temp,config.build.dist, config.build.src], 
            // baseDir 配置的dist 则这类样式地址就无法获取 /node_modules/bootstrap/dist/css/bootstrap.css
            routes: {
                '/node_modules': 'node_modules' // 这样开头的文件，直接找根目录的下node_modules
            }
        },
    });
}

/*---------   3、 压缩打包 ----------*/
const useref = () => {
    return src(config.build.paths.pages, {base: config.build.temp, cwd:config.build.temp})
    // 处理html 模版
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // 压缩 js
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    // 压缩 css
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    // 压缩 html
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
        collapseWhitespace: true, //折叠空白字符  collapse:折叠
        minifyCSS: true, // 行内样式
        minifyJS: true // 行内js 空属性、注释
        }
    )))
    .pipe(dest(config.build.dist)) 
}

// 编译任务：样式、JS、html，不相互依赖，所以使用并行
const compile = parallel(style, scripts, html)

// const build = parallel(images, fonts, extra)

// 调试：
// 1、本地更新 将 css\html\js 编译 后打包到 dist
// 2、启动服务
const develop = series(compile, serve)
// 打包
// 1、先删除dist
// 2、将 css\html\js 编译 后打包到 dist， 用useref 压缩
// 3、image、fonts、extra 打包到dist
const build = series(clean, parallel(series(compile, useref), images, fonts, extra))
module.exports = {
    clean,
    develop,
    build,
    scripts
}