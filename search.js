const request = require('request');
const cheerio = require('cheerio');
const google = require('google');
const nodemailer = require('nodemailer');
const MailListener = require('mail-listener2');
const dateTime = require('node-datetime');

var dt = dateTime.create();
var formatted = dt.format('Y-m-d H:M:S');
var formatMail = '';
var result = '';
var phoneNums = [];
var textFormatted = [];
var htmlText = '';
var searchResult = '';
var data = '';
var totalLinks = [];

let transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: false,
    port: 25,
    auth: { // Add own auth method here
        user: 'GMAIL',
        pass: 'GMAIL PASSWORD'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

var mailListener = new MailListener({
  username: 'GMAIL USERNAME',
  password: 'GMAIL PASS',
  host: 'imap.gmail.com',
  port: 993, // imap port
  tls: true,
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: 'INBOX', // mailbox to monitor
  searchFilter: ['UNSEEN', ['SINCE', formatted]], // the search filter being used after an IDLE notification has been retrieved
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
  mailParserOptions: {streamAttachments: true}, // options to be passed to mailParser lib.
  attachments: false, // download attachments as they are encountered to the project directory
  attachmentOptions: { directory: 'attachments/' } // specify a download directory for attachments
});

mailListener.start(); // start listening

// stop listening
//mailListener.stop();

mailListener.on('server:connected', function() {
  console.log('imapConnected');
});

mailListener.on('server:disconnected', function() {
  console.log('imapDisconnected');

  google.resultsPerPage = 5;
  var textWords = formatMail.split(' ');
  var nextCounter = 0;
  var searchUrl = '';

  google(formatMail, function (err, result) {
    if (err) console.error(err);

    var link = '';
    for (var i = 0, n = 1; i < result.links.length; i++, n++) {
      link = result.links[i];
      totalLinks[i] = result.links[i];

      console.log(' | ' + n + ' | ' + link.title + ' - ' + link.href);
      console.log(link.description + '\n');
    }
  });

  setTimeout(function() {
    var weightArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Uses weights to determine which link is best to search
    for (var i = 0 ; i < totalLinks.length ; i++) {      // Searches first link that has the most matching words from text message
      for (var z = 0 ; z < textWords.length ; z++) {
        if (totalLinks[i].description.includes(textWords[z])) {
          weightArray[i]++;
        }
      }
    }

    var tempIndex = weightArray.indexOf(findMaximum(weightArray));
    searchResult = totalLinks[tempIndex];
    searchUrl = searchResult.href;

      request(searchUrl, function(error, response, html) {

            if (error) throw error;

            if (!error) {
                console.log('LOADED BABY!');
                var $ = cheerio.load(html);
                $('html').filter(function() {
                    var pTags = $(this).text();
                    var stringIndexer = 0, n = 0;
                    // var validFormats = ['(###) ###-###', '###-###-####'];
                    while (stringIndexer < pTags.length) {

                      if ((pTags.charAt(stringIndexer) == '-') && (pTags.charAt(stringIndexer + 4) == '-')) {
                        phoneNums[n] = pTags.substring(stringIndexer - 3, stringIndexer + 9);
                        n++;
                      }

                      if ((pTags.charAt(stringIndexer) == '(') && (pTags.charAt(stringIndexer + 4) == ')') && (pTags.charAt(stringIndexer + 9) == '-')) {
                        phoneNums[n] = pTags.substring(stringIndexer, stringIndexer + 14);
                        n++;
                      }
                      stringIndexer++;
                    }
                });
            }
      });
  }, 5000);

  setTimeout(function() {
      var mailOptions = {
        from: 'GMAIL',
        to: 'GOOGLE VOICE NUMBER', // e.g. ###########.###########.XXXXXXXXXX@txt.voice.google.com
        subject: 'SUBJECT',
        text: phoneNums[0]
      }

      transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log(err);
        } else {
          console.log('Email Sent');
          console.log(info);
          console.log(phoneNums[0]);
        }
      });
  }, 8000);

  if (nextCounter < 0) {
    nextCounter += 1;
    if (result.next) result.next();
  }
});


mailListener.on('error', function(err) {
  console.log(err);
});

mailListener.on('idle', function() {
  dt = dateTime.create();
  formatted = dt.format('Y-m-d H:M:S');
});

mailListener.on('mail', function(mail, seqno, attributes) {
  dt = dateTime.create();
  formatted = dt.format('Y-m-d H:M:S');
  result = mail.text;
  var n = result.search('#');
  formatMail = result.substring(33, n)
  console.log('text: ' + mail.text);
  console.log('formatted text: ' + formatMail);
  mailListener.stop();
});

function findMaximum(array) {
  var arraySize = array.length;
  var max = 0;
  var count = 0;

  for (count = 0 ; count < arraySize ; count++) {
    if (array[count] > max) {
      max = array[count];
    }
  }

  return max;
}
