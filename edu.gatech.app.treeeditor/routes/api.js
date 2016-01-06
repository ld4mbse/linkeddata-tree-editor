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
var fs = require('fs');

var router = express.Router();
var portscanner = require('portscanner')
var spawn = require('child_process').spawn;
var exec = require("child_process").exec;

var sparql = require('sparql');
var jairo = require('jairo-parser');
var request = require('request');


function verifyFusekiPath( path , callback ){
	var fusekiPathVerification = {};
	if (fs.existsSync( data.fuseki_path + '/s-update' )) {
    	fusekiPathVerification.isValid = true;
    	fusekiPathVerification.message = 'Fuseki s-update script is exist';;
	}else{
		fusekiPathVerification.isValid = false;
		fusekiPathVerification.message = 'Fuseki s-update script is not exist';
	}
	console.log( 'fusekiPathVerification: ' + fusekiPathVerification );
	callback( fusekiPathVerification );
}


var exec = require('child_process').exec,
    child;


function checkServerLanIP(callback) {
	child = exec('ifconfig | grep inet | grep -v inet6 | cut -d" " -f2 | tail -n1',
	function (error, stdout, stderr) {
		stdout = stdout.replace(/\n$/,'');
		if(stdout == ''){
			child = exec("ifconfig eth0 | grep 'inet addr:' | cut -d: -f2 | awk '{ print $1}'",
			function (error, stdout, stderr) {
				stdout = stdout.replace(/\n$/,'');
				callback(stdout);
			});   
		}else{
			callback(stdout);
		}
	});   
}


router.get('/checkServerLanIP', function(req, res) {
	checkServerLanIP(function(ip){
		res.json( {ip: ip});
	});
});

router.post('/verify_fuseki_path', function(req, res) {
	console.log( '/verify_fuseki_path' );
	var path = req.body.path;
	console.log( 'path: ' + path )
	verifyFusekiPath( path, function( verification ){
		res.json( verification );
	});
});

function checkRubyExist( callback ) {
	try{
		var sp = spawn('ruby', ['-v']);
	    var isTerminated = false;
	    sp.stdout.on('data', function(data) {
	    	console.log( 'stdout: ' + data.toString() );
	        if( !isTerminated ) {
	        	isTerminated = true;
	        	callback( true ) ;
	        }
	    });
	    sp.on('error', function (err) {
		    callback( false ) ;
		});
	    sp.stderr.on('data', function(data) {
	    	console.log( 'stderr: ' + data.toString() );
	        if( !isTerminated ) {
	        	isTerminated = true;
	        	callback( false ) ;
	        }
	    });
	}catch( ex ){
		callback( false ) ;
	}
    
}

function verifyRubyInstallation( callback ){
	var rubyVerification = {};
	try{
		checkRubyExist( function( isExist ){
		 	rubyVerification.isValid = isExist;
		 	if( rubyVerification.isValid ) 
		 		rubyVerification.message = 'Ruby is installed';
			else 
				rubyVerification.message = 'Ruby is not installed';
			console.log( 'rubyVerification: ');
			console.log( rubyVerification );
			callback( rubyVerification );
		});
	}catch(ex){
		rubyVerification.message = 'Ruby is not installed';
		console.log( 'rubyVerification: ');
		console.log( rubyVerification );
		callback( rubyVerification );
	}
	
}

router.post('/verify_ruby_installation', function(req, res) {
	console.log( '/verify_ruby_installation' );
	verifyRubyInstallation( function( verification ){
		res.json( verification );
	});
});

function verifyFusekiHostAndPort( port , host , callback ){
 	portscanner.checkPortStatus( port , host, function(error, status) {
		var hostAndPortVerification = {};
		hostAndPortVerification.checkPort = port;
		hostAndPortVerification.checkHost = host;
		if(status === 'open') hostAndPortVerification.isValid = true;
		else hostAndPortVerification.isValid = false;
		console.log( 'hostAndPortVerification: ' );
		console.log( hostAndPortVerification );
		callback( hostAndPortVerification );
	});
}

router.post('/verify_fuseki_host_and_port', function(req, res) {
	console.log( '/verify_fuseki_host_and_port' );
	var port = req.body.port;
	var host = req.body.host;
	verifyFusekiHostAndPort( port , host , function( verification ){
		res.json( verification );
	});
});


function verifyUrl( url , callback ){
	var urlVerification = {};
	urlVerification.checkUrl = url;
	request( url , function (error, response, body) {
		if(error){
			urlVerification.isValid = false;
			urlVerification.message = 'Cannot connect to ' + url ;
		}else{
			console.log( 'response.statusCode : ' + response.statusCode );
			if (response.statusCode == 200 ) {
				urlVerification.isValid = true;
		    	urlVerification.message = url + ' is valid' ;
		  	}else{
			  	urlVerification.isValid = false;;
			  	urlVerification.message = 'Cannot connect to ' + url ;
			}
		}
		console.log( 'urlVerification: ' );
		console.log( urlVerification );
	  	callback( urlVerification );
	});
}

router.post('/verify_fuseki_query_url', function(req, res) {
	console.log( '/verify_fuseki_query_url' );
	var query_url = req.body.query_url;
	console.log( 'query_url: ' + query_url );
	var statement = 'select * where {?s ?p ?o} limit 1';
	var client = new sparql.Client( query_url );
	client.query( statement , function(err, resources) {
		console.log( 'err: ' );
		console.log( err );
		if(err){ 
			var data = {};
			data.isValid = false;
			data.resources = resources;
			console.log( data );
			res.json( data );
		}else{
			var data = {};
			data.isValid = true;
			data.resources = resources;
		    console.log( data );
			res.json( data );
		}
	});
});


function fuseki_update( update_url , update_statement, callback){
  try { 
    var callbackIsCompleted = false;
    console.log('Running fuseki_update');
    //console.log('update_url: ' + update_url);

    //update_statement = update_statement.replace(/\"/g,'\'');
    //update_statement = update_statement.replace( /\r?\n|\r/g,'');

   
    //console.log('update_statement: ' + update_statement);

    fs.writeFile('tempStmt', update_statement , function(err) {
	    if(err) {
	        return console.log(err);
	    }

        var cmd = 'ruby ./bin/s-update -v --service=' + update_url + ' --file=tempStmt';
    	console.log(cmd);
   		var s_update = exec(cmd);

		s_update.stdout.on('data', function(data) {
		console.log(data.toString());
		});

		s_update.stderr.on('data', function(data) {
		console.log('>>> ERROR >>>> ' + data.toString());
		if(!callbackIsCompleted) {
			callbackIsCompleted = true;
			callback(false,'error: ' + data.toString(),0);
		}
		});

		s_update.on('close', function(code) {
		var instance = 'update_statement: ' + update_statement;
		  console.log('closing code: ' + code);
		  if(!callbackIsCompleted) {
		    callbackIsCompleted = true;
		    callback(true, instance + ' has been imported') ;
		  }
		});

	});
   

  }catch (ex) { 
      callback(false, ex.toString());
  }
}

router.post('/verify_fuseki_update_url', function(req, res) {
	var update_statement = 'delete {  <http://example.com/Subject>  <http://example.com/Predicate>  <http://example.com/Object> }  where {}';
	var update_url = req.body.update_url;
	fuseki_update( update_url, update_statement, function( isCompleted , message){
		var data = {
			"isCompleted" : isCompleted,
			"message" : message,
			"update_statement" : update_statement
		};
		if(req.query.callback) res.jsonp(data);
		else res.json(data); 
	});
});

router.post('/send_sparql_update', function(req, res) {
	console.log( '/send_sparql_update' );
	var update_url = req.body.update_url;
	var update_statement = req.body.update_statement;
	fuseki_update( update_url, update_statement, function( isCompleted , message){
		var data = {
			"isCompleted" : isCompleted,
			"message" : message,
			"update_statement" : update_statement
		};
		if(req.query.callback) res.jsonp(data);
		else res.json(data); 
	});
});

router.post('/send_sparql_query', function(req, res) {
	console.log( '/send_sparql_query' );
	var query_statement = req.body.query_statement;
	var query_url = req.body.query_url;
	console.log( 'query_statement: ' + query_statement );
	console.log( 'query_url: ' + query_url )
	var client = new sparql.Client( query_url );
	client.query( query_statement , function(err, resources) {
		if(err){ 
			var data = {};
			data.isCompleted = false;
			data.resources = resources;
			res.json( data );
		}else{
			var data = {};
			data.isCompleted = true;
			data.resources = resources;
			res.json( data );
		}
	});
});


function checkFusekiRunning( port, host, callback ){
	var data = {};
	data.time = new Date();
	data.checkingPort = port;
	data.checkingHost = host;
 	portscanner.checkPortStatus( port , host , function(error, status) {
		if(status === 'open') data.isRunning = true;
		else data.isRunning = false;
		console.log( data );
		callback( data );
	});
}

router.post('/parse_rdfxml', function(req, res) {
	console.log( '/check_fuseki_running' );

	var content = req.body.content;
	var prefixesOfInterest = req.body.prefixesOfInterest;
	console.log('content',content);
	console.log('prefixesOfInterest',prefixesOfInterest);
	//console.log( 'content : ' + content);
	jairo.parse( 'rdfxml' , content , prefixesOfInterest , function( parsedData ){
		console.log( 'Jairo' );
		console.log( parsedData );
		res.json( parsedData );
	});

});


module.exports = router;
