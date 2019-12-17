const path = require('path');

const config = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'blueink-embed.js'
    },
    resolve: {
        modules: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'css'),
            'node_modules',
        ],
    },
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' },
            { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
        ],
    }
};

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        config.devtool = 'source-map';
    }

    if (!argv.mode || argv.mode === 'production') {
        config.mode = 'production';
        config.output.filename = 'blueink-embed.min.js';
    }

    return config;
};