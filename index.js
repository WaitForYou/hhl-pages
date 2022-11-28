#!/usr/bin/env node

// 执行入口  引用则会执行
// 设置当前跑的是当前的目录
process.argv.push('--cwd')
process.argv.push(process.cwd())

// 制定gulpfile的路径 ./node_modules/hhl-pages/lib/index.js
process.argv.push('--gulpfile')
// 该方法会将相对路径拼接生成一个绝对路径，并自动检验该路径是否存在, 会自动去找找到package的main字段
process.argv.push(require.resolve('./'))
// 先找到执行gulp-cli的执行
require('.bin/gulp')

