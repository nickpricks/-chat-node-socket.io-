/*
 * Author       : Nick Walter (Rohit Kumar is not here)
 * Date         : 12-06-2014
 * App Name     : Iamchat
 * Website      : iamrohit.in
 * Description  : Chat application using nodejs and socket.io
 */
var express     = require('express'),
    http        = require('http'),
    nodemailer  = require("nodemailer"),
    ios         = require('socket.io'),
    path        = require('path'),
    bodyParser  = require('body-parser'),

    users           = [],
    messages        = [],
    usersActivity   = [],
    onlineClient    = {},

    app = express(),

    port,
    server,
    io;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies

port = Number(process.env.PORT || 5000);

server = http.createServer(app).listen(port, function () {
    console.log("Listening on " + port);
});

io = ios.listen(server);

/** current date and time of any country! */
function currentDateTime(city, offset) {
    // create Date object for current location
    d = new Date();

    // convert to msec
    // add local time zone offset
    // get UTC time in msec
    utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    currentdate = new Date(utc + (3600000 * offset));

    // return time as a string

    var datetime = currentdate.getDate() + "/"
        + (currentdate.getMonth() + 1) + "/"
        + currentdate.getFullYear() + " @ "
        + currentdate.getHours() + ":"
        + currentdate.getMinutes() + ":"
        + currentdate.getSeconds();
    return datetime;
}

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

app.post('/sendEmail', function (req, res) {

    var smtpTransport = nodemailer.createTransport("SMTP", {
        service: "Gmail",
        auth: {
            user: "frankestine4@gmail.com",
            pass: "frankestine"
        }
    });
    var mailOptions = {
        from    : "chat ✔ <frankestine4@gmail.com>", // sender address
        to      : "frankestine4@gmail.com", // list of receivers
        subject : "node-chat Feedback ✔", // Subject line
        //text  : "Hello world ✔", // plaintext body
        html    : "<b>" + req.body.feedback + "</b>" // html body
    };
    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            res.send("Feedback could not send due to error: " + error);
        } else {
            res.send("Thanks! Feedback successfully sent!");
        }
    });
});

io.sockets.on('connection', function (socket) {
    /**
     * Validate user id duplicate
     */
    socket.on('chkUser', function (data) {
        var chk = users.indexOf(data.name);
        if (chk == (-1)) {
            var curdatetime = currentDateTime('India', '5.5');
            users.push(data.name);
            var data = {name: data.name, msg: ' joined chat on ' + curdatetime + ' !', color: 'text-success'};
            usersActivity.push(data);
            onlineClient[data.name] = socket;
        }
        socket.emit("chkUser", chk);
    });

    socket.on('joined', function (data) {
        var curdatetime = currentDateTime('India', '5.5');
        socket.username = data.name;
        io.sockets.emit('totalOnlineUser', users, socket.username);
        socket.emit("myInfo", socket.username, curdatetime);
        io.sockets.emit('newOne', data, messages);
        io.sockets.emit('usersActivity', usersActivity, curdatetime);
    });

    socket.on("chatMsg", function (data) {
        var curdatetime = currentDateTime('India', '5.5');
        var data = {name: socket.username + " [" + curdatetime + "] ", msg: data.msg}
        messages.push(data);
        io.sockets.emit("msgEveryOne", data, curdatetime);

    });

    socket.on('disconnect', function (data) {

        var curdatetime = currentDateTime('India', '5.5');
        if (socket.username != undefined) {
            var ax = users.indexOf(socket.username);
            users.splice(ax, 1);
            io.sockets.emit('totalOnlineUser', users, socket.username);
            data = {name: socket.username, msg: " left chat on " + curdatetime + " !", color: "text-danger"};
            usersActivity.push(data);

            io.sockets.emit('usersActivity', usersActivity, curdatetime);
            socket.emit('usersDisconnect');
            //socket.emit("disconnect",{});
        }
    });

    socket.on("typing", function (data) {
        io.sockets.emit("isTyping", {isTyping: data, user: socket.username});
    });

    socket.on('dateTimeUpdate', function (data) {
        socket.datetime = data.datatime;
    });

    ////// Create room /////
    socket.on('sendPrivateChat', function (data) {
        var socketTo = onlineClient[data.toName];
        var socketFrom = onlineClient[data.fromName];
        var group = 'private';
        socketTo.join(group);  //create room
        socketFrom.join(group);
        //io.sockets.in(data.name).emit('privateChat', data);
        socketTo.emit('privateChat', data);
        socketFrom.emit('privateChat', data);
    });

    socket.on('sendprivatechat', function (key, msg) {
        var clientSocket = onlineClient[key];
        if (clientSocket == null) {
        } else {
            clientSocket.emit('getprivatemsg', socket.username, key, msg);
        }
    });
});
