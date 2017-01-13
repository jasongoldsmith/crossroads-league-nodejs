
module.exports = {
  hostName: 'http://crsrd-tinyurl.herokuapp.com',
  tinyUrlHost:"http://crsrd.co",
  enableNewRelic: true,
  enforceSSL:false,
  portNum: -1,
  s3: {
    imageBucket: "feighty-images",
    contentsBucket: "feighty-videos",
    momentsBucket: "feighty-moments",
  },
  awsProfileImageUrl: "http://feighty-images.s3.amazonaws.com/",
  enableBungieIntegration: true
};