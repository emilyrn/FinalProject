var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(express.static('public'));
app.use(bodyParser.json());

var pool = require("./pg-connection-pool");

app.get('/db/userinfo', function(req, res) {
	//retrives list of all users
    pool.query("SELECT * FROM userinfo;").then(function(result) {
        res.send(result.rows);
    });
});

app.get('/db/userinfo/:username', function(req, res) {
	//retrives list of users. Used in logging in/creating account
    var username = req.params.username;
    pool.query("SELECT * FROM userinfo WHERE username=$1::text ;", [username]).then(function(result) {
        res.send(result.rows);
    });
});

app.get('/db/library/:username', function(req, res) {
	//retrieve library of user.
    var username = req.params.username;
    pool.query("SELECT * FROM library WHERE username=$1::text;", [username]).then(function(result) {
        res.send(result.rows);
    });
});

app.get('/db/watchlist/:username', function(req, res) {
	//retrieve watchlist of user
    var username = req.params.username;
     pool.query("SELECT * FROM watchlist WHERE username=$1::text;", [username]).then(function(result) {
        res.send(result.rows);
     });
});

app.get('/db/library', function(req, res) {
	//retrieve libraries of all users
    pool.query("SELECT * FROM library;").then(function(result) {
        res.send(result.rows);
    });
});

app.get('/db/watchlist', function(req, res) {
	//retrieve watchlists of all users
    pool.query("SELECT * FROM watchlist;").then(function(result) {
        res.send(result.rows);
    });
});

app.get('/db/userinfo/:username', function(req, res) {
	//get email by user
    var username = req.params.username;
    pool.query("SELECT email FROM userinfo WHERE username=$1::text;", [username]).then(function(result) {
        res.send(result.rows);
    });
});

app.post('/db/signup/', function(req, res) {
    //add user to database
    var item = req.body;
    var sql = "INSERT INTO userinfo(username, email, password)" +
    "VALUES ($1::text, $2::text, $3::text)";
    var entry = [item.username, item.email, item.password];
    pool.query(sql, entry).then(function() {
        res.send("INSTERTED");
    });
});

app.post('/db/library/', function(req, res) {
    //add book to library
    var item = req.body;
    var sql = "INSERT INTO library(author, title, thumbnailurl, username, description)" +
    "VALUES ($1::text, $2::text, $3::text, $4::text, $5::text)";
    var entry = [item.author, item.title, item.thumbnailurl, item.username, item.description];
    pool.query(sql, entry).then(function() {
        res.status(201);
        res.send("INSTERTED");
    });
});

app.post('/db/watchlist/', function(req, res) {
    //add book to watchlist
    var item = req.body;
    var sql = "INSERT INTO watchlist(author, title, thumbnailurl, username, description)" +
    "VALUES ($1::text, $2::text, $3::text, $4::text, $5::text)";
    var entry = [item.author, item.title, item.thumbnailurl, item.username, item.description];
    pool.query(sql, entry).then(function() {
        res.status(201);
        res.send("INSTERTED");
    });
});

app.delete('/db/library/:id', function(req, res) {
    //delete from library
    var id = req.params.id;
    var sql = "DELETE FROM library WHERE id=$1::int;"
    var entry = [id];
    pool.query(sql, entry).then(function(result) {
        res.send(result.rows);
    });
});

app.delete('/db/watchlist/:id', function(req, res) {
    //delete from watchlist
    var id = req.params.id;
    var sql = "DELETE FROM watchlist WHERE id=$1::int;"
    var entry = [id];
    pool.query(sql, entry).then(function(result) {
        res.send(result.rows);
    });
});

app.post('/email', function(req, res) {
	//send email to user about book request
	var body = req.body;
	var user1 = {
		name: body.userName1,
		email: body.userEmail1,
		title: body.title1
	}
	var user2 = {
		name: body.userName2,
		email: body.userEmail2,
		title: body.title2
	}
	sendEmail(user1, user2);
	console.log('Success');
	res.send('Success');
});

app.get('/db/matches/:username', function(req, res) {
	//get matches for user
    var username = req.params.username;
    pool.query("SELECT library.username, library.title FROM library, watchlist WHERE watchlist.title = library.title AND watchlist.username = $1::text;"
    	, [username]).then(function(result) {
        res.send(result.rows);
    });
});

app.post('/db/login', function(req, res) {
	var body = req.body;
	pool.query("SELECT * FROM userinfo WHERE username=$1::text", [req.body.username]).then(function(result) {
		if (result.rows[0].password === body.password) {
			res.send('Success');
		} else {
			res.send('Invalid');
		}
	}).catch(function(error) {
		res.send('User not found');
	});
});

 // Sign-up user verification
app.get('/db/signup/:username', function (req, res) {
	var username = req.params.username;
	pool.query("SELECT username FROM userinfo WHERE username=$1::text", [username]).then(function(result) {
		if(result.rows[0].username === username) {
			res.send('Username taken');
		} else {
			res.send('Username available');
		}
	}).catch(function(error) {
		res.send('Username available');
	});
});

// Retrieve popular books
app.get('/db/popularBooks', function(req, res) {
    pool.query("SELECT title, author, thumbnailurl, count(title) FROM watchlist GROUP BY title, author, thumbnailurl ORDER BY count DESC LIMIT 10").then(function(result) {
        res.send(result.rows);
    });
})

/*
This call sends an email to one recipient, using a validated sender address
*/

var mailjet = require ('node-mailjet')
    .connect(process.env.API_KEY, process.env.API_SECRET);

function handleError (err) {
	throw new Error(err.ErrorMessage);
}

function sendEmail (user1, user2) {
	email = {};
	email['FromName'] = 'Book Buddies';
	email['FromEmail'] = 'Book.Buddies.Exchange.App@gmail.com';
	email['Subject'] = user1.name + ' has requested a trade!';
	email['Recipients'] = [{Email: user2.email}];
	email['Text-Part'] = 'Hello, ' + user2.name + '. ' + user1.name + ' has proposed a trade with you. They would like to exchange their book(s) '
	+ user1.title + ' for your book(s) called ' + user2.title + '. Please contact this user at ' + user1.email + ' if you wish to trade.';

    mailjet.post('send')
    	.request(email)
    	.catch(handleError);
    	console.log('email success');
}

// Server port listen stuff
var port = process.env.PORT || 3030;
app.listen(port, function() {
	console.log('Server is running on ' + port);
});