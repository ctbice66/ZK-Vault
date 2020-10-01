const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'main.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
				options: {
					presets: ["@babel/preset-react"]
					}
            },
			{
				test: /\.css$/,
				loader: [
					'style-loader',
					'css-loader',
				],
			},
        ]
    },
	node: {
		'crypto': true,
		'ecurve': true,
		'big': true,
		'react': true,
		'react-dom': true
	}
};