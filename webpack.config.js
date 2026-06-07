const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { GUEST_PATHS, getPageMeta } = require('./site-meta.config');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';
  const htmlTemplate = path.join(__dirname, 'src', 'index.html');

  const htmlPlugins = [
    new HtmlWebpackPlugin({
      template: htmlTemplate,
      filename: 'index.html',
      templateParameters: getPageMeta(),
    }),
    ...GUEST_PATHS.map((slug) => new HtmlWebpackPlugin({
      template: htmlTemplate,
      filename: `${slug}/index.html`,
      templateParameters: getPageMeta(slug),
    })),
  ];

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? '[name].[contenthash].js' : '[name].js',
      publicPath: '/',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
        {
          test: /\.scss$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'),
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(__dirname, 'src', 'assets', 'images'),
            to: 'assets/images',
          },
          {
            from: path.join(__dirname, 'public'),
            to: '.',
            noErrorOnMissing: true,
          },
        ],
      }),
      ...htmlPlugins,
      ...(isProd
        ? [
            new MiniCssExtractPlugin({
              filename: '[name].[contenthash].css',
            }),
          ]
        : []),
    ],
    devServer: {
      static: path.join(__dirname, 'dist'),
      compress: true,
      port: 8081,
      hot: true,
      historyApiFallback: {
        rewrites: [
          ...GUEST_PATHS.map((slug) => ({
            from: new RegExp(`^/${slug}/?$`),
            to: `/${slug}/index.html`,
          })),
          { from: /./, to: '/index.html' },
        ],
      },
      watchFiles: ['src/**/*'],
    },
    devtool: isProd ? 'source-map' : 'eval-source-map',
  };
};
