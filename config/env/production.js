module.exports = {
  hostName: 'https://live.crossroadsapp.co',
  tinyUrlHost:'http://crsrd.co/',
  enableNewRelic: true,
  portNum: -1,
  s3: {
    imageBucket: "feighty-images",
    contentsBucket: "feighty-videos",
    momentsBucket: "feighty-moments",
  },
  awsProfileImageUrl: "http://feighty-images.s3.amazonaws.com/",
  enableBungieIntegration:process.env.enableBungieIntegration|| false,
  logLevel: 'info',
  enableNewRelic:process.env.enableNewRelic || true,
  disableEnvetUpdateForComments: process.env.DISABLE_EVENT_UPDATE_COMMENTS || false,
  minUsersForGroupNotification: 0
};