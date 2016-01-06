/*********************************************************************************************
 * Copyright (c) 2015  Georgia Institute of Technology.
 *
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the BSD 3-Clause License
 *  which accompanies this distribution. The BSD 3-Clause License is 
 *  available at https://opensource.org/licenses/BSD-3-Clause
 *  
 *******************************************************************************************/

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var api = require('./routes/api');
app.use('/', api);

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 9000 );

var server = app.listen(app.get('port'), function() {
    console.log('\n');
    console.log('******************************************************');
    console.log('*                       TreeEditor                   *');
    console.log('******************************************************');
    console.log('\n');
    console.log('TreeEditor client is available at http://localhost:'+ server.address().port);
    console.log('\n');
});

