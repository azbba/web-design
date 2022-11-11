import gulp, { dest, parallel, series, src, watch } from "gulp";
import info from "./package.json";
import dartSass from "sass";
import gulpSass from "gulp-sass";
import rename from "gulp-rename";
import sourceMaps from "gulp-sourcemaps";
import del from "del";
import yargs from "yargs";
import gulpIf from "gulp-if";
import autoPrefixer from "gulp-autoprefixer";
import named from "vinyl-named";
import webpackStream from "webpack-stream";
import imagemin from "gulp-imagemin";
import browserSync from "browser-sync";
import rpc from "gulp-replace";
import wpPot from "gulp-wp-pot";
import zip from "gulp-zip";

const sass = gulpSass(dartSass);
const PRODUCTION = yargs.argv.prod;
const server = browserSync.create();

/**
 * Browser Sync tasks
 */

export const serve = (done) => {
    server.init({
        proxy: `http://localhost/${info.name}`,
    });
    done();
};

export const reload = (done) => {
    server.reload();
    done();
};

const paths = {
    styles: {
        src: "src/scss/**/*.scss",
        dest: "assets/css",
    },
    scripts: {
        all: "src/js/**/*.js",
        src: "src/js/bundle.js",
        dest: "assets/js",
    },
    images: {
        src: "src/images/**/*.{jpg,jpeg,png,svg}",
        dest: "assets/images/",
    },
    package: {
        src: [
            "**/*",
            "vendor{,/**}",
            "!node_modules{,/**}",
            "!src{,/**}",
            "!.babelrc",
            "!.editorconfig",
            "!gulpfile.babel.js",
            "!package-lock.json",
            "!README.md",
            "!.git{,/**}",
            "!.vscode",
            "!packaged",
            "!package.json",
            "!composer.json",
            "!composer.lock",
        ],
        dest: "packaged",
    },
    suffix: !PRODUCTION ? "" : "-min",
};

/**
 * Clean task
 */

export const clean = () =>
    del(["assets/**", "languages", "packaged", "!assets/vendor"], {
        force: true,
    });

/**
 * CSS tasks
 */

export const styles = () => {
    return src(paths.styles.src)
        .pipe(gulpIf(!PRODUCTION, sourceMaps.init()))
        .pipe(
            sass({
                outputStyle: !PRODUCTION ? "expanded" : "compressed",
            }).on("error", sass.logError)
        )
        .pipe(
            autoPrefixer({
                cascade: false,
            })
        )
        .pipe(
            rename({
                basename: info.name,
                suffix: paths.suffix,
            })
        )
        .pipe(gulpIf(!PRODUCTION, sourceMaps.write(".")))
        .pipe(dest(paths.styles.dest));
};

/**
 * JavaScript tasks
 */

export const scripts = () => {
    return src(paths.scripts.src)
        .pipe(named())
        .pipe(
            webpackStream({
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            use: {
                                loader: "babel-loader",
                                options: {
                                    presets: ["@babel/preset-env"],
                                },
                            },
                        },
                    ],
                },
                output: {
                    filename: "[name].js",
                },
                devtool: !PRODUCTION ? "source-map" : false,
                mode: PRODUCTION ? "production" : "development",
            })
        )
        .pipe(
            rename({
                basename: info.name,
                suffix: paths.suffix,
            })
        )
        .pipe(dest(paths.scripts.dest));
};

/**
 * Images task
 */

export const images = () => {
    return src(paths.images.src)
        .pipe(gulpIf(PRODUCTION, imagemin()))
        .pipe(dest(paths.images.dest));
};

/**
 * Generates pot files
 */

export const pot = () => {
    return src("**/*.php")
        .pipe(
            wpPot({
                domain: info.name,
            })
        )
        .pipe(dest(`languages/${info.name}.pot`));
};

/**
 * Compress Task
 */

export const compress = () => {
    return src(paths.package.src)
        .pipe(rpc("_aztheme", info.name.replace("-", "_")))
        .pipe(zip(`${info.name}.zip`))
        .pipe(dest(paths.package.dest));
};

/**
 * Watch tasks
 */

export const watchTasks = () => {
    watch(paths.styles.src, series(styles, reload));
    watch(paths.scripts.all, series(scripts, reload));
    watch(paths.images.src, series(images, reload));
    watch("**/*.php", reload);
};

/**
 * Development task
 */

export const dev = series(
    clean,
    parallel(styles, scripts, images),
    serve,
    watchTasks
);

/**
 * Production task
 */

export const build = series(clean, parallel(styles, scripts, images), pot);

/**
 * Bundle task
 */

export const bundle = series(build, compress);

export default dev;
