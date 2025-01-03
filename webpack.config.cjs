const path = require('path');
const { UserscriptPlugin } = require("webpack-userscript");
const headers = require('./headers.json');

module.exports = {
    mode: "production",
    entry: "./src/main.js",
    output: {
        filename: "alei.user.js",
        path: __dirname, //output directory = project root
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader",
                        options: {
                            attributes: {
                                title: "style-from-webpack", //adding a title so the stylesheet can be saved from Eric's wrath
                            },
                        },
                    },
                    {
                        loader: "css-loader",
                        options: {
                            url: false,
                        }
                    },
                ],
            },
            {
                test: /\.(glsl|vert|frag)$/,
                use: "webpack-glsl-loader",
            },
        ],
    },
    plugins: [
        new UserscriptPlugin({
            headers: headers,
        }),
    ],
    /*devtool: "inline-source-map",*/ // increases file size about 5x
};