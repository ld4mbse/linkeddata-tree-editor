/*********************************************************************************************
 * Copyright (c) 2015  Georgia Institute of Technology.
 *
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the BSD 3-Clause License
 *  which accompanies this distribution. The BSD 3-Clause License is 
 *  available at https://opensource.org/licenses/BSD-3-Clause
 *  
 *******************************************************************************************/

angular.module('App', 
    [ 'ui.bootstrap',
      'ui.utils',
      'ui.codemirror', 
      'cgBusy',
      'ui-notification'
      ])
    .factory('factoryName', function() {/* stuff here */})
    .directive('directiveName', function() {/* stuff here */})
    .config(function($httpProvider){
        $httpProvider.defaults.timeout = 5000;
    });
;

angular.module('App').controller("MainController", function ( $rootScope, $scope, Notification, $http, $interval, $location ) {   

    $scope.buildNo = '4DEC20150630PM';
    $scope.editorOptionsEditable = {
        lineWrapping : true,
        lineNumbers: true,
        smartIndent: true,
        matchBrackets: true,
        scrollbarStyle: "simple"
    };
    $scope.editorOptionsEditableForSelectedNode = {
        lineWrapping : true,
        lineNumbers: true,
        smartIndent: true,
        matchBrackets: true,
        scrollbarStyle: "simple"
    };
    $scope.isEditorRefresh = false;

    $scope.confSyncInterval = { state : "20" };

    $scope.changeInterval = function(){
      console.log($scope.confSyncInterval);
      $scope.syncSecCountDefaultValue = $scope.confSyncInterval.state;
      $scope.syncSecCount = $scope.syncSecCountDefaultValue;
      $scope.sync_interval = $scope.confSyncInterval.state * 1000;
      console.log('$scope.syncSecCountDefaultValue: ' + $scope.syncSecCountDefaultValue);
      console.log('$scope.syncSecCount: ' + $scope.syncSecCount);
      console.log('$scope.sync_interval: ' + $scope.sync_interval);
    }


    $scope.confToggleTreeSyncBtnText = 'Turn-on TreeSync';
    $scope.confToggleTreeSync = { state : "off"};

    $scope.treeErrorMessage = '';

    $scope.isOnTreeSync = function(){
      return $scope.confToggleTreeSync.state === 'on';
    } 

    $scope.activeNodeRdf = '';
    $scope.setActiveNodeRdf = function( rdf){
      $scope.activeNodeRdf = rdf;
    };

 
    $interval( function(){
      $scope.isEditorRefresh = !$scope.isEditorRefresh;
    },1000);

    var local_1SecInterval;
    var local_20SecsInterval;


    function localf_startTimers(){
       local_1SecInterval = $interval( function(){
        if( $scope.isOnTreeSync() ){
          if( $scope.syncSecCount === undefined ) $scope.syncSecCount = $scope.confSyncInterval.state;
          $scope.syncSecCount--;
        }else{
          $scope.syncSecCount = $scope.syncSecCountDefaultValue;
        }
      },1000);

      local_20SecsInterval = $interval( function(){
        console.log('Start auto ');
        if( $scope.isOnTreeSync() ){
          console.log('Start auto ' + $scope.sync_interval + ' msecs');
          $scope.syncSecCount = $scope.confSyncInterval.state;
          localf_firePublish();
          $scope.syncMessage = 'Last sync at ';
          $scope.syncMessageTime = new Date();
        }else{
          $scope.syncSecCount = $scope.confSyncInterval.state;
        }

      }, 20000 );
    }

    function localf_stopTimers(){
      $interval.cancel( local_1SecInterval );
      $interval.cancel( local_20SecsInterval );
      $scope.syncSecCount = $scope.confSyncInterval.state;
    }

    $scope.turnOnTreeSync = function(){
      $scope.confToggleTreeSync.state = 'on';
      localf_startTimers();
    }

    $scope.turnOffTreeSync = function(){
      localf_firePublish();
      $scope.confToggleTreeSync.state = 'off';
      localf_stopTimers();
    }

    $scope.syncSecCount = $scope.confSyncInterval.state;
    $scope.syncMessage = 'Last sync at';
    $scope.syncMessageTime = new Date();
    $scope.firePublishMessage = '';
    $scope.firePublishMessageTime = '';

    function localf_firePublish(callback){
      $scope.firePublishMessage = 'localf_firePublish() at ';
      $scope.firePublishMessageTime = new Date();
      localf_publishAllChangesToTriplestore(callback);
    }



    $scope.deleteAllChanges = function(){
      var modelChange;
      for (var i = $scope.modelChanges.length - 1; i >= 0; i--) {
        modelChange = $scope.modelChanges[i];
        if( modelChange.isPublished )$scope.modelChanges.splice(i,1);
      };
    }



    $scope.clearPublishedList = function(){
      $scope.publishedModelChanges = [];
    }


    function localf_publishAllChangesToTriplestore(callback){
      for (var i = $scope.modelChanges.length - 1; i >= 0; i--) {
        var modelChange = $scope.modelChanges[i];
        if( !modelChange.isPublished ){
          var updateStatement = modelChange.updateStatement;            
          localf_sendSparqlUpdate( modelChange , function( data ){
            if( data.isCompleted ){
              $scope.modelChanges.splice( i ,1 );
              if(callback !== undefined ) callback(true);
            }
          });
        }
      }      
    } 


    $scope.publishAllChangesToTriplestore = function(){
      console.log( 'publishAllChangesToTriplestore' );
      localf_publishAllChangesToTriplestore();
    }

    function localf_installTree( sysmlBlockModel ){
      jqueryFuncs.clear();
      jqueryFuncs.deleteAllNodes();
      jqueryFuncs.unsetNodeSelection();
      makeTree( sysmlBlockModel );
      jqueryFuncs.unfoldAll();
      updateRdfModificationTime();
    }

    function localf_uninstallTree(){
      jqueryFuncs.clear();
      jqueryFuncs.deleteAllNodes();
      jqueryFuncs.unsetNodeSelection();
    }

    function localf_emptySysMLBlockModel(){
      $scope.sysmlBlockModel = [];
      $scope.sysmlBlockModel.blocks = [];
      $scope.sysmlBlockModel.blockDict = [];
    }

    function localf_notify_info( title , message ){
      Notification.primary(
        { title: title ,  
          message: message, delay: 3000
        });
    }

    function localf_notify_error( title , message ){
      Notification.error(
        { title: title ,  
          message: message, delay: 3000
        });
    }

    function localf_reloadTreeFromTriplestore(){
      console.log('localf_reloadTreeFromTriplestore');
      localf_loadTriplesFromFuseki( function( triples ){
        if( triples.length === 0 )  $scope.treeErrorMessage = 'Empty model';
        else  $scope.treeErrorMessage = '';
          localf_convertTriplesToBlocks( triples  , function( sysmlBlockModel ){
            if( sysmlBlockModel.blocks.length === 0){
              localf_emptySysMLBlockModel();
              localf_uninstallTree();
            }else{
              $scope.sysmlBlockModel = sysmlBlockModel;
              $scope.rdfModel = localf_convertBlocksToRdf($scope.sysmlBlockModel);
              localf_installTree( $scope.sysmlBlockModel );
              $scope.treeErrorMessage = '';
            }
          });         
        });
    }

    $scope.reloadTreeWithConfirmationDialog = function(){
      if (confirm('Are you sure you want to reload tree?')) {
        console.log( 'reloadTree' );
        localf_reloadTreeFromTriplestore();
      }
    }

    $scope.reloadTreeWithoutConfimationDialog = function(){
      console.log( 'reloadTreeWithoutConfimationDialog' );
      localf_reloadTreeFromTriplestore();
    }


    $scope.reloadExampleHSUVTreeWithoutConfimationDialog = function(){
      console.log( 'reloadExampleHSUVTreeWithoutConfimationDialog' );
      localf_emptySysMLBlockModel();
      localf_uninstallTree();
      $scope.rdfModel = local_exampleRdfModelHSUV;
      localf_installTreeFromRdf( $scope.rdfModel );
      $scope.treeErrorMessage = '';
    }

    $scope.reloadExampleSatelliteTreeWithoutConfimationDialog = function(){
      console.log( 'reloadExampleSatelliteTreeWithoutConfimationDialog' );
      localf_emptySysMLBlockModel();
      localf_uninstallTree();
      $scope.rdfModel = local_exampleRdfModelSatellite;
      localf_installTreeFromRdf( $scope.rdfModel );
      $scope.treeErrorMessage = '';
    }

    $scope.reloadTreeWithUserRdfModel = function( userRdfModel ){
      console.log( 'reloadTreeWithUserRdfModel' );
      localf_emptySysMLBlockModel();
      localf_uninstallTree();
      $scope.rdfModel = userRdfModel;
      localf_installTreeFromRdf( $scope.rdfModel );
      $scope.treeErrorMessage = '';
    }

    $scope.deleteAllTriplesInTriplestore = function(){
      if (confirm('Are you sure you want to delete all triples in triplestore?')) {
        localf_loadTriplesFromFuseki( function( triples ){
          localf_deleteAllTreesInTriplestore( triples , function(){
          });
        });
      }
    }

    $scope.installExampleModel = function( mode ){
      console.log( 'installExampleModel()  mode=' + mode);
      if (confirm('Are you sure you want to install original ' + mode + ' model example')) {

        if( mode.toUpperCase() === 'HSUV'.toUpperCase() ){
          $scope.rdfModel = local_exampleRdfModelHSUV;
        }else if( mode.toUpperCase() === 'SATELLITE'.toUpperCase() ){
          $scope.rdfModel = local_exampleRdfModelSatellite;
        }else{
          alert('Found error mode=' + mode + ' is not allowed');
          return;
        }

        var targetRdfModel = $scope.rdfModel;
        localf_loadTriplesFromFuseki( function( triples ){
          
          if( triples.length === 0 ){
            localf_syncInTreeToTriplestore( targetRdfModel , function( isCompleted ){
                if(isCompleted){
                  localf_reloadTreeFromTriplestore();
                }
            });
          }else{

            localf_deleteAllTreesInTriplestore( triples , function( isCompleted ){
              if(isCompleted){
                localf_syncInTreeToTriplestore( targetRdfModel, function( isCompleted ){
                    if(isCompleted){
                      localf_reloadTreeFromTriplestore();
                    }
                });
              }else{
                alert( 'Cannot delete triples in triplestore' );
              }
           });
          }
          
          
          
        });
      }
    }

    function localf_deleteAllTreesInTriplestore( triples , callback ){
      console.log( 'localf_deleteAllTreesInTriplestore()');

      if( triples.length === 0){
            alert( 'Triplestore is already empty!' );
            callback( false );
            return;
          }

      var deleteStatements = [];
      var isFinish = true;

      for (var i = 0; i < triples.length; i++) {
        var deleteStatement = 'delete where{ ' + triples[i].subject_uri + ' ?p ?o}';
        deleteStatements.push( deleteStatement );
        localf_sendSparqlUpdateWithoutLogging( deleteStatement , function( data ){      
          if( !data.isCompleted ){
            isFinish = false;
          }
        });
      };

      if( isFinish ){

        localf_emptySysMLBlockModel();
        localf_uninstallTree();
        $scope.rdfModel = '';

        var modelChange = {};
        modelChange.isPublished = true;
        modelChange.status = 'Published';
        modelChange.operationTitle = 'Delete all triples';
        modelChange.updateStatement = deleteStatements;

        var publish = {};
        publish.time = new Date();
        publish.modelChange = modelChange;
        $scope.publishedModelChanges.push( publish );
        callback( true );
      }else{
        alert( 'Found error in localf_deleteAllTreesInTriplestore' );
        callback( false );
      }
    }


    function localf_syncInTreeToTriplestore( rdfModel , callback ){
      console.log( 'localf_syncInTreeToTriplestore()');
      if( rdfModel === undefined || rdfModel === '' ){
        alert( 'localf_syncInTreeToTriplestore:  rdfModel is empty' );
        return;
      }

      localf_convertRdfToFusekiTriples( rdfModel , function( triples ){

        if( triples.length === 0){
          alert( 'RDF model is empty' );
          callback( false );
        }else{

          $scope.tripleModel = triples;
          generateSPARQLInsertStmtFromTriples( triples , function( updateStatement ){
            $scope.sparqlInsertStmtModel = updateStatement;
            localf_sendSparqlUpdateWithoutLogging( updateStatement , function( data ){
              if( data.isCompleted ){
                var modelChange = {};
                modelChange.isPublished = true;
                modelChange.status = 'Published';
                modelChange.operationTitle = 'Installed example triples';
                modelChange.updateStatement = updateStatement;
                var publish = {};
                publish.time = new Date();
                publish.modelChange = modelChange;
                $scope.publishedModelChanges.push( publish );
              }else{
                alert('Found err: ' + data.message );
              }
              callback( data.isCompleted );
            });
          });
          
        }
      });
    }


    function localf_convertRdfToFusekiTriples( rdf , callback ){
      $rootScope.processLabel = $http.post( '/parse_rdfxml' , { "content" :  rdf, "prefixesOfInterest" : prefixes} ).
        success(function( parsedData, status, headers, config) {      
          if( parsedData.isError ){
            alert( 'RDF parsing error P1' );
          }else{
            var triples = [];
            if( parsedData.triples.length > 0){
              triples = parsedData.triples;
            }
            callback( triples );
          } 
        }).
        error(function(data, status, headers, config) {
          alert( 'RDF parsing error P2' );
        });
    }

    
    function localf_convertFusekiTriplesToRdf( triples ){
      console.log( 'localf_convertFusekiTriplesToRdf' );
      localf_convertTriplesToBlocks( triples , function( sysmlBlocks ){
        var rdf = localf_convertBlocksToRdf( sysmlBlocks );
        return rdf;
      });
    }

    function localf_convertBlocksToRdf( sysmlBlocks ){
      console.log( 'localf_convertBlocksToRdf()' );
      console.log( sysmlBlocks );

      var rdf = '<rdf:RDF \n';
      for (var i = 0; i < prefixes.length; i++) {
        prefixes[i]
        rdf += ' xmlns:' + prefixes[i].prefix + '="' + prefixes[i].uri  + '" \n';
      };
      rdf += ' > \n\n';

      var block;
      for (var i = 0; i < sysmlBlocks.blocks.length; i++) {
        block = sysmlBlocks.blocks[i];
        rdf += localf_convertBlockToRdf( block );
      };

      if( sysmlBlocks.partAssociations !== undefined){
        var partAsso;

        for (var i = 0; i < sysmlBlocks.partAssociations.length; i++) {
          partAsso = sysmlBlocks.partAssociations[i];
          rdf += localf_convertPartAssoToRdf( partAsso );
        };
      }
      
      if( sysmlBlocks.referenceAssociations !== undefined){
        var refAsso;
        for (var i = 0; i < sysmlBlocks.referenceAssociations.length; i++) {
          refAsso = sysmlBlocks.referenceAssociations[i];
          rdf += localf_convertReferenceAssoToRdf( refAsso );
        };
      }

      rdf += '</rdf:RDF>\n';
      return rdf;
    }


    function localf_convertReferenceAssoToRdf( partAsso ){
      var rdf = '';
      rdf += ' <rdf:Description rdf:about="' + removeUnwantedSymbolInRDF( partAsso.resourceUri ) + '"> \n';
      rdf += '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Reference"/>  \n';
      rdf += '   <sysml_block:association_target_block rdf:resource="' + removeUnwantedSymbolInRDF( partAsso.target_block_resourceUri ) + '"/> \n';  
      rdf += '   <sysml_block:association_target_title>' + partAsso.target_title + '</sysml_block:association_target_title> \n';
      rdf += '   <sysml_block:association_target_multiplicity>' + partAsso.target_multiplicity + '</sysml_block:association_target_multiplicity> \n';
      rdf += ' </rdf:Description> \n\n';
      return rdf;
    }


    function localf_convertPartAssoToRdf( partAsso ){
      var rdf = '';
      rdf += ' <rdf:Description rdf:about="' + removeUnwantedSymbolInRDF( partAsso.resourceUri ) + '"> \n';
      rdf += '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n';
      rdf += '   <sysml_block:association_target_block rdf:resource="' + removeUnwantedSymbolInRDF( partAsso.target_block_resourceUri ) + '"/> \n';  
      rdf += '   <sysml_block:association_target_title>' + partAsso.target_title + '</sysml_block:association_target_title> \n';
      rdf += '   <sysml_block:association_target_multiplicity>' + partAsso.target_multiplicity + '</sysml_block:association_target_multiplicity> \n';
      rdf += ' </rdf:Description> \n\n';
      return rdf;
    }

    function localf_convertBlockToRdf( block ){
      var rdf = '';
      var dc_name_Value = block.name;
      var rdf_type_Value =  block.typeResourceUri; 

      rdf += ' <rdf:Description rdf:about="' + removeUnwantedSymbolInRDF( block.resourceUri ) + '"> \n';
      rdf += '   <dc:name>' + removeUnwantedSymbolInRDF( dc_name_Value ) + '</dc:name> \n';
      rdf += '   <rdf:type rdf:resource="' + removeUnwantedSymbolInRDF ( rdf_type_Value )  + '"/>  \n';

      var child;
      for (var j = 0; j < block.childBlocks.length; j++) {
        child = block.childBlocks[j];
        rdf += '   <sysml_block:owns rdf:resource="' + removeUnwantedSymbolInRDF( child.resourceUri ) + '"/> \n';  
      };

      for (var j = 0; j < block.childParts.length; j++) {
        child = block.childParts[j];
        rdf += '   <sysml_block:part rdf:resource="' +  removeUnwantedSymbolInRDF( child.fifoPartOriginal.shift().resourceUri ) + '"/> \n';  
      };

      for (var j = 0; j < block.childReferences.length; j++) {
        child = block.childReferences[j];
        rdf += '   <sysml_block:reference rdf:resource="' + removeUnwantedSymbolInRDF( child.reference.resourceUri )  + '"/> \n';  
      };
     
      rdf += ' </rdf:Description> \n\n';
      return rdf;
    }


    $scope.treeSyncStmtHistory = [];

    function localf_loadTriplesFromFuseki( callback ){
      var query_statement = 'select * where {?s ?p ?o}'
      $rootScope.processLabel = $http.post( '/send_sparql_query' , { "query_url" : $scope.fuseki_query_url , "query_statement" : query_statement } ).
          success(function(data, status, headers, config) { 
            var triples = [];
            if( data.isCompleted ) {
          
              var object;
              for (var i = 0; i < data.resources.results.bindings.length; i++) {
                object = data.resources.results.bindings[i];
                var triple = {};

                if( object.s.type === 'uri' ) {
                  triple.subject_uri = '<' + object.s.value + '>';
                  triple.subject_qn = object.s.value.split('/').pop();
                  triple.subject_qn = triple.subject_qn.split('#').pop();
                }else {
                  triple.subject_uri = object.s.value;
                  triple.subject_qn = object.s.value
                }
                
                if( object.p.type === 'uri' ) {
                  triple.predicate_uri = '<' + object.p.value + '>';
                  triple.predicate_qn = object.p.value;
                  var predicate_uri;

                  for (var j = 0; j < prefixes.length; j++) {

                      predicate_uri = prefixes[j].uri;
                      triple.predicate_qn = 
                          triple.predicate_qn.replace( 
                              predicate_uri,
                              prefixDict[ predicate_uri ] + ':'
                          );
                  }
                }else {
                  triple.predicate_uri = object.p.value;
                  triple.predicate_qn = object.p.value
                }

                if( object.p.type === 'uri' ) {
                  triple.object_uri = '<' + object.o.value + '>';
                  triple.object_qn = object.o.value .split('/').pop();
                  triple.object_qn = triple.object_qn.split('#').pop();
                }else {
                  triple.object_uri = object.o.value;
                  triple.object_qn = object.o.value
                }

                triples.push( triple );
              }

              //console.log(')))))))))))))))))))))))))))');
              //console.log( triples );
              //console.log(')))))))))))))))))))))))))))');
              callback( triples );
              
            }else {

              //console.log( triples );
              callback( triples );
            }
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });
    }

    $scope.fuseki_path = 'undefined';
    $scope.fuseki_port = 3030;
    $scope.fuseki_host = '127.0.0.1';
    $scope.fuseki_tdb = 'treedb';
    

    $scope.fuseki_query_url = 'http://' + $location.host() + ':3030/treedb/sparql';
    $scope.fuseki_update_url =  'http://' + $location.host() + ':3030/treedb/update';
    $scope.fuseki_console =  'http://' + $location.host() + ':3030/treedb';

    if (window['treeAppConf'] && window['treeAppConf'].fusekiSparqlUrl && window['treeAppConf'].fusekiUpdateUrl ) {
      $scope.fuseki_query_url = window['treeAppConf'].fusekiSparqlUrl;
      $scope.fuseki_update_url = window['treeAppConf'].fusekiUpdateUrl;
    }
    
    Notification.primary(
        { title: 'fuseki_query_url' ,  
          message: $scope.fuseki_query_url, delay: 3000
        });

    Notification.primary(
        { title: 'fuseki_update_url' ,  
          message: $scope.fuseki_update_url, delay: 3000
        });


    $scope.errorMessage_fusekiPath = '';
    $scope.successMessage_fusekiPath = '';
    $scope.errorMessage_rubyInstallation = '';
    $scope.successMessage_rubyInstallation = '';
    $scope.isValidFusekiPath = 0;
    $scope.isValidRubyInstallation = 0;
    $scope.isValidFusekiHostAndPort = 0;
    $scope.isValidFusekiTDB = 0;
    $scope.isValidFusekiQueryUrl = 0;
    $scope.isValidFusekiUpdateUrl = 0;

    $scope.setChildBlock = function( childBlock ){
      if( $scope.activeNode === null ){
        $scope.errorMessage = 'Please click a tree item you want to set child block';
        return;
      }

      if(  $scope.activeNode.block.resourceUri === childBlock.resourceUri ){
        $scope.errorMessage = 'Cannot set child block itself';
        return;
      }

      var parentBlock = $scope.activeNode.block;     
      parentBlock.childBlocks.push( childBlock );
      childBlock.parentBlocks.push( parentBlock );

      var stmt = {}; 
      stmt.operation = 'insert';
      stmt.subject_uri = parentBlock.resourceUri;
      stmt.predicate_uri = 'sysml_block:owns';
      stmt.object_uri = childBlock.resourceUri;
      var sparql_stmts = [];
      sparql_stmts.push( stmt );

      localf_reloadTreeWithRDF( $scope.sysmlBlockModel );
      var operationTitle = 'SetChildBlock';
      var updateStatement = createSparqlUpdateStmt( sparql_stmts );
      addSPARQLUpdateToQueue( updateStatement , operationTitle );
    }

    $scope.unsetParentBlock = function( parentBlock ){
      if( $scope.activeNode === null ){
        $scope.errorMessage = 'Please click a tree item you want to unset parent block';
        return;
      }

      var childBlock = $scope.activeNode.block;  
      for (var i = childBlock.parentBlocks.length - 1; i >= 0; i--) {
        if( parentBlock.resourceUri === childBlock.parentBlocks[i].resourceUri ){
          childBlock.parentBlocks.splice(i,1);
          break;
        }
      };
   
      for (var i = parentBlock.childBlocks.length - 1; i >= 0; i--) {
        if( childBlock.resourceUri === parentBlock.childBlocks[i].resourceUri ){
          parentBlock.childBlocks.splice(i,1);
          break;
        }
      };

      var stmt = {}; 
      stmt.operation = 'delete';
      stmt.subject_uri = parentBlock.resourceUri;
      stmt.predicate_uri = 'sysml_block:owns';
      stmt.object_uri = childBlock.resourceUri;
      var sparql_stmts = [];
      sparql_stmts.push( stmt );

      localf_reloadTreeWithRDF( $scope.sysmlBlockModel );
      var operationTitle = 'UnsetParentBlock';
      var updateStatement = createSparqlUpdateStmt( sparql_stmts );
      addSPARQLUpdateToQueue( updateStatement , operationTitle );
    }

    $scope.changeHost = function( newHost ){
      $scope.fuseki_host = newHost;
      $scope.fuseki_query_url = 
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/sparql';
      $scope.fuseki_update_url =  
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/update';
      $scope.fuseki_console = 'http://127.0.0.1:' + $scope.fuseki_port + '/';
    }

    $scope.changePort = function( newPort ){
      $scope.fuseki_port = newPort;
      $scope.fuseki_query_url = 
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/sparql';
      $scope.fuseki_update_url =  
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/update';
      $scope.fuseki_console = 'http://127.0.0.1:' + $scope.fuseki_port + '/';
    }

    $scope.changeTDB = function( newTDB){
      $scope.fuseki_tdb = newTDB;
      $scope.fuseki_query_url = 
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/sparql';
      $scope.fuseki_update_url =  
        'http://127.0.0.1:' + $scope.fuseki_port + '/' + $scope.fuseki_tdb + '/update';

    }

    $scope.verifyFuseki = function( 
                          fuseki_path , 
                          fuseki_host , 
                          fuseki_port , 
                          fuseki_tdb, 
                          fuseki_query_url , 
                          fuseki_update_url ){

        $scope.fuseki_path = fuseki_path;
        $scope.fuseki_port = fuseki_port;
        $scope.fuseki_host = fuseki_host;
        $scope.fuseki_tdb = fuseki_tdb;
        $scope.fuseki_query_url = fuseki_query_url;
        $scope.fuseki_update_url = fuseki_update_url;


       $rootScope.processLabel = $http.post( '/verify_ruby_installation' ).
          success(function(data, status, headers, config) {    
            if( data.isValid ) $scope.isValidRubyInstallation = 1;
            else $scope.isValidRubyInstallation = -1;
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });

      $rootScope.processLabel = $http.post( '/verify_fuseki_host_and_port' , { "host" : $scope.fuseki_host , "port" : $scope.fuseki_port } ).
          success(function(data, status, headers, config) {    
            if( data.isValid ) $scope.isValidFusekiHostAndPort = 1;
            else $scope.isValidFusekiHostAndPort = -1;
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });

      $rootScope.processLabel = $http.post( '/verify_fuseki_query_url' , { "query_url" : $scope.fuseki_query_url } ).
          success(function(data, status, headers, config) {   
            if( data.isValid ) $scope.isValidFusekiQueryUrl = 1;
            else $scope.isValidFusekiQueryUrl = -1;
            console.log(data);
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });


      $rootScope.processLabel = $http.post( '/verify_fuseki_update_url' , { "update_url" : $scope.fuseki_update_url } ).
          success(function(data, status, headers, config) {   
            if( data.isCompleted ) $scope.isValidFusekiUpdateUrl = 1;
            else $scope.isValidFusekiUpdateUrl = -1;
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });
          
    }

    
    function localf_sendSparqlQuery( query_statement , callback ){
      var query_url = $scope.fuseki_query_url;
      $rootScope.processLabel = $http.post( '/send_sparql_query' , { "query_url" : query_url , "query_statement" : query_statement } ).
          success(function(data, status, headers, config) {  
            callback ( data ); 
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });
    }

    $scope.modelChanges = [];
    $scope.publishedModelChanges = [];

    function localf_sendSparqlUpdate( modelChange , callback ){
      var update_url = $scope.fuseki_update_url;
      $rootScope.processLabel = $http.post( '/send_sparql_update' , { "update_url" : update_url , "update_statement" : modelChange.updateStatement } ).
          success(function(data, status, headers, config) {  

            var publish = {};
            publish.time = new Date();
            publish.modelChange = modelChange;
            publish.modelChange.isPublished = data.isCompleted;

            if( publish.modelChange.isPublished ){
              publish.modelChange.status = 'Published';
            }else{
              publish.modelChange.status = data.message;
            }

            $scope.publishedModelChanges.push( publish );

            callback ( data ); 
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });
    }

    function localf_sendSparqlUpdateWithoutLogging( updateStatement , callback ){
      var update_url = $scope.fuseki_update_url;
      $rootScope.processLabel = $http.post( '/send_sparql_update' , { "update_url" : update_url , "update_statement" : updateStatement } ).
          success(function(data, status, headers, config) {  
            callback ( data ); 
          }).
          error(function(data, status, headers, config) {
            alert('Found error');
          });
    }

    // Used for ui-codemirror
    $scope.editorOptions = {
        lineWrapping : false,
        lineNumbers: true,
        smartIndent: true,
        theme: 'eclipse',
        matchBrackets: true,
        maxHighlightLength: 30000
    };

    var local_exampleRdfModelHSUV = 
      '<rdf:RDF \n' +  
      ' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n' + 
      ' xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" \n' +  
      ' xmlns:dc="http://purl.org/dc/elements/1.1/" \n' +  
      ' xmlns:sysml="http://omg/org/sysml/1.3/" \n' +  
      ' xmlns:sysml_block="http://www.example.com/sysml_block/" > \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block1"> \n' +  
      '   <dc:name>HSUV</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block2"/> \n' +   
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block3"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block4"/> \n' +   
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block5"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block6"/> \n' +   
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block7"/>  \n' +  
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block2"> \n' +  
      '   <dc:name>PowerSubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block8"/> \n' +   
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block9"/> \n' +   
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block3"> \n' +  
      '   <dc:name>ChassisSubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block9"/> \n' +   
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block4"> \n' +  
      '   <dc:name>BodySubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block5"> \n' +  
      '   <dc:name>LighthingSubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block6"> \n' +  
      '   <dc:name>InteriorSubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' + 
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block7"> \n' +  
      '   <dc:name>BrakeSubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:owns rdf:resource="http://omg.org/sysml/Block8"/> \n' +   
      ' </rdf:Description> \n\n' +   

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block8"> \n' +  
      '   <dc:name>BrakePedal</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +   

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block9"> \n' +  
      '   <dc:name>WheelHubAssemblySubsystem</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +    

      '</rdf:RDF>\n';

    var local_exampleRdfModelSatellite = 
      '<rdf:RDF \n' +  
      ' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n' + 
      ' xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" \n' +  
      ' xmlns:dc="http://purl.org/dc/elements/1.1/" \n' +  
      ' xmlns:sysml="http://omg/org/sysml/1.3/" \n' +  
      ' xmlns:sysml_block="http://www.example.com/sysml_block/" > \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block1"> \n' +  
      '   <dc:name>DellSat-77 Satellite</dc:name> \n' +  
      '   <sysml_block:value_property>/mass :kg</sysml_block:value_property> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart1"/> \n' +   
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart2"/>  \n' +  
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart3"/> \n' +   
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart4"/>  \n' + 
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block2"> \n' +  
      '   <dc:name>Electrical Power Subsystem</dc:name> \n' +  
      '   <sysml_block:value_property>mass :kg</sysml_block:value_property> \n' + 
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' + 
      '   <sysml_block:reference rdf:resource="http://omg.org/sysml/BlockReference2"/>  \n' + 
      '   <sysml_block:reference rdf:resource="http://omg.org/sysml/BlockReference4"/>  \n' + 
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block3"> \n' +  
      '   <dc:name>Attitude and Orbit Control Subsystem</dc:name> \n' +  
      '   <sysml_block:value_property>mass :kg</sysml_block:value_property> \n' + 
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +  
      
      ' <rdf:Description rdf:about="http://omg.org/sysml/Block4"> \n' +  
      '   <dc:name>Environmental Control Subsystem</dc:name> \n' +  
      '   <sysml_block:value_property>mass :kg</sysml_block:value_property> \n' + 
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block5"> \n' +  
      '   <dc:name>Communication and Data Handling Subsystem</dc:name> \n' +  
      '   <sysml_block:value_property>mass :kg</sysml_block:value_property> \n' + 
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:reference rdf:resource="http://omg.org/sysml/BlockReference1"/>  \n' + 
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart5"/>  \n' + 
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart6"/>  \n' + 
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart7"/>  \n' + 
      '   <sysml_block:part rdf:resource="http://omg.org/sysml/BlockPart8"/>  \n' + 
      ' </rdf:Description> \n\n' +   

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block6"> \n' +  
      '   <dc:name>Flight Computer</dc:name> \n' +  
      '   <sysml_block:value_property>memoryCapacity :Mb</sysml_block:value_property> \n' + 
      '   <sysml_block:value_property>dataPerOrbit :Mb</sysml_block:value_property> \n' + 
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      '   <sysml_block:reference rdf:resource="http://omg.org/sysml/BlockReference3"/>  \n' + 
      ' </rdf:Description> \n\n' + 

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart1"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block2"/> \n' +   
      '   <sysml_block:association_target_title>eps</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart2"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block3"/> \n' +   
      '   <sysml_block:association_target_title>aocs</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart3"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block4"/> \n' +   
      '   <sysml_block:association_target_title>ecs</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart4"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block5"/> \n' +   
      '   <sysml_block:association_target_title>cdhs</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockReference1"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Reference"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block2"/> \n' +   
      '   <sysml_block:association_target_title>eps</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockReference2"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Reference"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block5"/> \n' +   
      '   <sysml_block:association_target_title>cdhs</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart5"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block6"/> \n' +   
      '   <sysml_block:association_target_title>primaryComputer</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart6"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block6"/> \n' +   
      '   <sysml_block:association_target_title>backupComputer</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1..2</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  
   
      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockReference3"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Reference"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block2"/> \n' +   
      '   <sysml_block:association_target_title>eps</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockReference4"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Reference"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block6"/> \n' +   
      '   <sysml_block:association_target_title>fc</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>2..3</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block7"> \n' +  
      '   <dc:name>Modulator</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +

      ' <rdf:Description rdf:about="http://omg.org/sysml/Block8"> \n' +  
      '   <dc:name>Transmitter</dc:name> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/Block"/>  \n' +  
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart7"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block7"/> \n' +   
      '   <sysml_block:association_target_title>mod</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  

      ' <rdf:Description rdf:about="http://omg.org/sysml/BlockPart8"> \n' +  
      '   <rdf:type rdf:resource="http://omg.org/sysml/BlockAssociation/Part"/>  \n' +  
      '   <sysml_block:association_target_block rdf:resource="http://omg.org/sysml/Block8"/> \n' +   
      '   <sysml_block:association_target_title>tx</sysml_block:association_target_title> \n' +
      '   <sysml_block:association_target_multiplicity>1</sysml_block:association_target_multiplicity> \n' +
      ' </rdf:Description> \n\n' +  


      '</rdf:RDF>\n';

    $scope.rdfModel; 
    $scope.tripleModel;
    $scope.sparqlInsertStmtModel;
    $scope.parsedRdf = {};
    $scope.parsedRdf.json = {};
    $scope.parsedRdf.messageColor = "black";

    function removeUnwantedSymbolInRDF( input ){
      if( input === undefined ){
        return;
      }
      input = input.replace( '>' , '');
      input = input.replace( '<' , '');
      input = input.replace( '"' , '');
      return input;
    }

    var prefixes = [
        { "prefix" : "rdf"  , "uri" : "http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
        { "prefix" : "rdfs" , "uri" : "http://www.w3.org/2000/01/rdf-schema#"},
        { "prefix" : "dc" , "uri" : "http://purl.org/dc/elements/1.1/"},
        { "prefix" : "sysml" , "uri" : "http://omg/org/sysml/1.3/"},
        { "prefix" : "sysml_block" , "uri" : "http://www.example.com/sysml_block/"},
    ];

    var prefixKeys = [];
    for (var i = 0; i < prefixes.length; i++) {
      prefixKeys[ prefixes[i].prefix ] = prefixes[i].uri;
    };

    var prefixDict = [];
    for (var i = 0; i < prefixes.length; i++) {
      prefixDict[ prefixes[i].uri ] = prefixes[i].prefix;
    };

    function guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }

    function createTree( block ){
      var tree = {}; 
      tree.text = block.name;
      tree.isFolder = true;
      tree.block = block;
      block.tree = tree;
      tree.madeByRdf = block.madeByRdf;
      tree.children = [];

      var child;
      for (var i = 0; i < block.childBlocks.length; i++) {
        child = block.childBlocks[i];
        child.myTreeParent = block;
        tree.children.push( createTree( child ) );
      };

      var partBlock;
      for (var i = 0; i < block.childParts.length; i++) {
        partBlock = block.childParts[i];
        partBlock.myTreeParent = block;
        tree.children.push( createPartTree( partBlock ) );
      };

      var referenceBlock;
      for (var i = 0; i < block.childReferences.length; i++) {
        referenceBlock = block.childReferences[i];
        referenceBlock.myTreeParent = block;
        tree.children.push( createReferenceTree( referenceBlock ) );
      };

      return tree;
    }

    function removeWhitespace(value) {
        return (!value) ? '' : value.replace(/ /g, '');
    };

     function createReferenceTree( block ){
      var tree = {};
      var reference = block.reference;
      tree.uiIcon = 'reference';
      tree.madeByRdf = block.madeByRdf;
      tree.text = 
          reference.target_title 
          + '[' + reference.target_multiplicity + ']: ' 
          + block.name;
      tree.block = block;
      block.tree = tree;
      tree.children = [];
      return tree;
    }

    function createPartTree( block ){
      var tree = {};
      tree.madeByRdf = block.madeByRdf;
      tree.block = block;
      tree.children = [];
      return tree;
    }

    function makeTree( sysmlBlockModel ){
      jqueryFuncs.deleteAllNodes();
      jqueryFuncs.unsetNodeSelection();
      var uniqueNodes = {};
      uniqueNodes.nodes = [];
     
      // Store unique nodes 
      for (var i = 0; i < sysmlBlockModel.blocks.length; i++) {
        var block = sysmlBlockModel.blocks[i];
        var tree = createTree( block ) ;
        tree.createdByUniqueScreen = true;
        uniqueNodes.nodes[ tree.block.resourceUri ] = tree;
      };

      // Remove duplciate element that genraeted by the first tree creation
      for( var prop in uniqueNodes.nodes){
        var uniqueNode = uniqueNodes.nodes[prop];
        var isTheNodeThatHasParent = uniqueNode.block.parentBlocks.length !== 0;
        // HasParent
        if( isTheNodeThatHasParent ){
          var parentBlockOfTheUniqueNode = uniqueNode.block.parentBlocks[0];
          //parentBlockOfTheUniqueNode.tree.children.push( uniqueNode );
          var childOfParent;
          for (var i = parentBlockOfTheUniqueNode.tree.children.length - 1; i >= 0; i--) {
            childOfParent = parentBlockOfTheUniqueNode.tree.children[i];
            var replacementNode = uniqueNodes.nodes[ childOfParent.block.resourceUri ];
            var IsNotCreatedByUniqueScreen = childOfParent.createdByUniqueScreen === undefined;
            if( IsNotCreatedByUniqueScreen ){
              //replace 
              parentBlockOfTheUniqueNode.tree.children.splice(i,1);
              parentBlockOfTheUniqueNode.tree.children.push( replacementNode );
            }
          };
        }else{
          jqueryFuncs.addNode( uniqueNode );
        }
      };

      var allnode = jqueryFuncs.getAllNode();
      for (var i = 0; i < allnode.length; i++) {
        var n1 = allnode[i];
        copyTree( n1 );
        for (var j = 0; j < n1.children.length; j++) {
          var n2 = n1.children[j];
          copyTree( n2 );
          for (var k = 0; k < n2.children.length; k++) {
          var n3 = n2.children[k];
          copyTree( n3 );
        };
        };
      };
      jqueryFuncs.refresh();
      jqueryFuncs.foldAll();
      return;
    }

    function copyTree( node ){
      for (var k = 0; k < node.children.length; k++) {
        var subnode = node.children[k];
        var tree = {};
        tree.id  = guid();
        tree.isFolder = true;
        tree.madeByRdf = subnode.block.madeByRdf;
        var asso = subnode.block.parentBlocksAssoHash[ node.block.resourceUri ];
        if( asso === 'part' ) {
          tree.uiIcon = 'part';
          var part = subnode.block.fifoPart.shift();
          tree.text = 
              part.target_title 
              + '[' + part.target_multiplicity + ']: ' 
              + subnode.block.name;
        }else if( asso === 'reference' ) {
          tree.uiIcon = 'reference';
          var reference = subnode.block.reference;
          tree.text = 
              reference.target_title 
              + '[' + reference.target_multiplicity + ']: ' 
              + subnode.block.name;
        }else{
          tree.uiIcon = null;
          tree.text = subnode.block.name;
        }

        tree.madeByRdf = subnode.block.madeByRdf;
        tree.children = subnode.children;
        tree.block = subnode.block;
        delete node.children[k];
        node.children[k] = tree;
      };
    }

    $scope.isOpenAddNewBlockPanel = false;

    $scope.openAddNewBlockPanel = function(){
      if( $scope.isOpenAddNewBlockPanel === false) { 
        $scope.isOpenAddNewBlockPanel = true;
        $scope.regenerateResourceUriOfNewBlock();
      }
    }

    $scope.toggleAddNewBlockPanel = function(){
      $scope.isOpenAddNewBlockPanel = !$scope.isOpenAddNewBlockPanel;
      return $scope.isOpenAddNewBlockPanel;
    }

    $scope.atRoot = function(){
      $scope.activeNode = null;
      jqueryFuncs.clear()
    }

    function closeAddNewBlockPanel(){
      $scope.newBlockResourceURI = '';
      $scope.newBlockName = '';
      $scope.regenerateResourceUriOfNewBlock();
      $scope.isOpenAddNewBlockPanel = false;
    }

    $scope.activeNode;
    $scope.activeNodeName;

    $scope.setActiveNode = function( node ){
      $scope.activeNode = node;
      $scope.activeNodeName = $scope.activeNode.block.name;
    }

    $scope.clearNodeName = function(){
      console.log( '$scope.clearNodeName');
      $scope.activeNode = null;
    }
    
    $scope.errorMessage = '';
    $scope.errorMessage_AddNewBlock = '';

    $scope.setNodeName = function( newNodeName ){
      console.log( '$scope.setNodeName: $scope.newNodeName = ' + newNodeName);
      
      var validate0 = newNodeName === undefined;
      if( validate0 ){
        $scope.errorMessage = 'Please select a tree item before set its name';
        return;
      }

      var validate1 = $scope.activeNode === null || $scope.activeNode === undefined;
      if( validate1 ){
        $scope.errorMessage = 'Please select a tree item before set its name';
        return;
      }

      $scope.errorMessage = '';

      var oldName = $scope.activeNode.block.name;
      $scope.activeNode.block.name = newNodeName;

      var stmt1 = {}; 
      stmt1.operation = 'delete';
      stmt1.subject_uri = $scope.activeNode.block.resourceUri;
      stmt1.predicate_uri = 'dc:name';
      stmt1.object_uri = '"' + oldName + '"';

      var stmt2 = {}; 
      stmt2.operation = 'insert';
      stmt2.subject_uri = $scope.activeNode.block.resourceUri;
      stmt2.predicate_uri = 'dc:name';
      stmt2.object_uri = '"' + newNodeName + '"';

      var sparql_stmts = [];
      sparql_stmts.push( stmt1 ) ;
      sparql_stmts.push( stmt2 );

      localf_reloadTreeWithRDF( $scope.sysmlBlockModel );
      
      var operationTitle = 'SetName';
      var updateStatement = createSparqlUpdateStmt( sparql_stmts );
      addSPARQLUpdateToQueue( updateStatement , operationTitle );
      if( !$scope.isOnTreeSync() ) localf_firePublish();
    }

    $scope.useQueue = false;

    $scope.newBlockResourceURI = '';
    $scope.newBlockTypeURI = 'http://omg.org/sysml/Block';
    $scope.newBlockName = '';

    $scope.updateTimeRdfXml = new Date();

    function getAllChildBlocksUnderActiveNode( activeNode ){
      var childBlocksArrayStore = {};
      childBlocksArrayStore.keys = [];

      setChildBlocksUnderActiveNode( activeNode.block , childBlocksArrayStore);
      
      console.log('childBlocksArrayStore');
      console.log(childBlocksArrayStore);

      var returnChildBlocks = [];
      for(var key in childBlocksArrayStore.keys){
        console.log('getAllChildBlocksUnderActiveNode push ' + key);
        returnChildBlocks.push( childBlocksArrayStore.keys[key] );
      }
      return returnChildBlocks;
    }


    function setChildBlocksUnderActiveNode( block , childBlocksArrayStore ){
      console.log('setChildBlocksUnderActiveNode');
      var clv1;
      for (var i = 0; i < block.childBlocks.length; i++) {
        clv1 = block.childBlocks[i];
        childBlocksArrayStore.keys[ clv1.resourceUri ] = clv1.resourceUri;
        setChildBlocksUnderActiveNode( clv1 , childBlocksArrayStore);
      };
    }


    function cascadeRemove( activeNode , sysmlBlockModel , sparql_stmts ){
      console.log('cascadeRemove');
      var allChildBlocksUnderActiveNode = getAllChildBlocksUnderActiveNode( activeNode );
      nonCascadeRemove( activeNode , sysmlBlockModel , sparql_stmts );

      console.log('cascadeRemove allChildBlocksUnderActiveNode = ');
      console.log(allChildBlocksUnderActiveNode);

      for (var i = 0; i < allChildBlocksUnderActiveNode.length; i++) {
        removeSysMLBLockOwnsFromSysmlBlockModel( allChildBlocksUnderActiveNode[i] , sysmlBlockModel , sparql_stmts );
      };

      for (var i = 0; i < allChildBlocksUnderActiveNode.length; i++) {
        removeBlockInstanceFromSysmlBlockModel( allChildBlocksUnderActiveNode[i] , sysmlBlockModel , sparql_stmts );
      };

    }

    function nonCascadeRemove( activeNode , sysmlBlockModel , sparql_stmts ){
      console.log('nonCascadeRemove');
      var targetResoruceUri = activeNode.block.resourceUri;
      removeBlockInstanceFromSysmlBlockModel( targetResoruceUri , sysmlBlockModel , sparql_stmts );
      removeSysMLBLockOwnsFromSysmlBlockModel( targetResoruceUri , sysmlBlockModel , sparql_stmts );
    }

    function removeBlockInstanceFromSysmlBlockModel( targetResoruceUri , sysmlBlockModel , sparql_stmts ){
      var eachBlock;
      for (var i = sysmlBlockModel.blocks.length - 1; i >= 0; i--) {
        eachBlock = sysmlBlockModel.blocks[i];
        if( eachBlock.resourceUri === targetResoruceUri){
            sysmlBlockModel.blocks.splice(i,1);
            delete sysmlBlockModel.blockDict[ eachBlock.resourceUri ];
            var stmt = {};
            stmt.operation = 'delete';
            stmt.subject_uri = eachBlock.resourceUri;
            stmt.predicate_uri = '?p';
            stmt.object_uri = '?o';
            sparql_stmts.push( stmt );
        }
      }
    }

    function removeSysMLBLockOwnsFromSysmlBlockModel( targetResoruceUri , sysmlBlockModel , sparql_stmts ){
      var eachBlock;
      for (var i = sysmlBlockModel.blocks.length - 1; i >= 0; i--) {
        eachBlock = sysmlBlockModel.blocks[i];
        var eachChildOnEachBlock;
        for (var j = eachBlock.childBlocks.length - 1; j >= 0; j--) {
          eachChildOnEachBlock = eachBlock.childBlocks[j];
          if(eachChildOnEachBlock.resourceUri === targetResoruceUri){
            eachBlock.childBlocks.splice(j,1);
            var stmt = {};
            stmt.operation = 'delete';
            stmt.subject_uri = eachBlock.resourceUri;
            stmt.predicate_uri = 'sysml_block:owns';
            stmt.object_uri = eachChildOnEachBlock.resourceUri;
            sparql_stmts.push( stmt );
          }
        }
      }
    }

    $scope.removeBlock = function( isCascadeMode ,activeNode, disabledConfirmDialog, callback){

      if( activeNode === null || activeNode  === undefined ){
        $scope.errorMessage = 'Please click a tree item you want to delete';
        return;
      }
      
      $scope.errorMessage = '';

      if(disabledConfirmDialog === undefined || disabledConfirmDialog === false){
         if ( confirm('Are you sure you want to Move or Delete Block ' + activeNode.block.name + '?') ) {
           _removeBlock( isCascadeMode , activeNode, callback);
         }
      }else if( disabledConfirmDialog === true){
          _removeBlock( isCascadeMode , activeNode, callback)
      }
    }

    function _removeBlock( isCascadeMode , activeNode, callback){
      var sparql_stmts = [];

        console.log('$scope.activeNode');
        var referenceNode = activeNode;
        console.log( referenceNode );

        var sparql_stmts = [];

        var operationTitle = '';
        if( isCascadeMode ){
          operationTitle = 'Cascade Delete';
          cascadeRemove( 
            activeNode ,
            $scope.sysmlBlockModel ,
            sparql_stmts
          );
        }else{
          operationTitle = 'Non-Cascade Delete';
          nonCascadeRemove( 
            activeNode ,
            $scope.sysmlBlockModel ,
            sparql_stmts
          );
        }

        localf_reloadTreeWithRDF( $scope.sysmlBlockModel );

        var updateStatement = createSparqlUpdateStmt( sparql_stmts );
        addSPARQLUpdateToQueue( updateStatement , operationTitle );
        if( !$scope.isOnTreeSync() ) {
          localf_firePublish(callback);
          $scope.activeNode = undefined;
        }
    }

    function createSparqlUpdateStmt( sparql_stmts ){
      var line = '';
      var stmt = '';

      for (var i = 0; i < prefixes.length; i++) {
        prefixes[i]
        stmt += 'prefix ' + prefixes[i].prefix + ': <' + prefixes[i].uri  + '> ' + line;
      };
      

      for (var i = 0; i < sparql_stmts.length; i++) {
        stmt += line + line; 
        if( sparql_stmts[i].operation.toUpperCase() === 'delete'.toUpperCase() ){
          stmt += 
          sparql_stmts[i].operation + ' ' + 
          ' where { ' + line +  
          '  ' + sparql_stmts[i].subject_uri + line + 
          '  ' + sparql_stmts[i].predicate_uri + line + 
          '  ' + sparql_stmts[i].object_uri + line + ' };';
        }else if( sparql_stmts[i].operation.toUpperCase() === 'insert'.toUpperCase() ){
          stmt += 
          sparql_stmts[i].operation + ' { ' + line +  
          '  ' + sparql_stmts[i].subject_uri + line + 
          '  ' + sparql_stmts[i].predicate_uri + line + 
          '  ' + sparql_stmts[i].object_uri + line + 
          '} where {};';
        }else{
          alert( 'Parse SPARQL update statement error');
        }
        
      };
     
      stmt += line + line; 
      return stmt;
    }


    function createSparqlUpdateStmtWithoutPrefixes( sparql_stmts ){
      var line = '';
      var stmt = '';

      for (var i = 0; i < sparql_stmts.length; i++) {
        stmt += line + line; 
        if( sparql_stmts[i].operation.toUpperCase() === 'delete'.toUpperCase() ){
          stmt += 
          sparql_stmts[i].operation + ' ' + 
          ' where { ' + line +  
          '  ' + sparql_stmts[i].subject_uri + line + 
          '  ' + sparql_stmts[i].predicate_uri + line + 
          '  ' + sparql_stmts[i].object_uri + line + ' };';
        }else if( sparql_stmts[i].operation.toUpperCase() === 'insert'.toUpperCase() ){
          stmt += 
          sparql_stmts[i].operation + ' { ' + line +  
          '  ' + sparql_stmts[i].subject_uri + line + 
          '  ' + sparql_stmts[i].predicate_uri + line + 
          '  ' + sparql_stmts[i].object_uri + line + 
          '} where {};';
        }else{
          alert( 'Parse SPARQL update statement error');
        }
        
      };
     
      stmt += line + line; 
      return stmt;
    }

    function updateRdfModificationTime(){
      $scope.updateTimeRdfXml = new Date();
    }

    $scope.sparqlStmt = '';

    function validateURL(textval) {
      var rg = /^(http|https):\/\/(([a-zA-Z0-9$\-_.+!*'(),;:&=]|%[0-9a-fA-F]{2})+@)?(((25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])(\.(25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])){3})|localhost|([a-zA-Z0-9\-\u00C0-\u017F]+\.)+([a-zA-Z]{2,}))(:[0-9]+)?(\/(([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*(\/([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*)*)?(\?([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?(\#([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?)?$/;
      var urlregex = new RegExp( rg );
      return urlregex.test(textval);
    }
    
    function createAddNewBlockSPARQL(){

    }

    function createAddNewBlockObject( newBlockName , newBlockResourceURI , newBlockTypeResourceUri ){
      var newBlock = {};
      newBlock.name = newBlockName;
      newBlock.resourceName = newBlockName;
      newBlock.resourceUri = '<' + newBlockResourceURI + '>';
      newBlock.typeResourceUri = '<' + newBlockTypeResourceUri + '>';
      newBlock.typeResourceName = 'Block';
      newBlock.isTreeInstant = false;
      newBlock.parentBlocksAssoHash = [];
      newBlock.hasParentTree = false;
      newBlock.isSysMLOwns = true; // <---- Change this when we go to POC 2.2
      newBlock.isPart = false;
      newBlock.isReference = false;
      newBlock.parts = [];
      newBlock.fifoPart = [];
      newBlock.fifoPartOriginal = [];
      newBlock.references = [];
      newBlock.parentBlocksHash = [];
      newBlock.parentBlocks = [];
      newBlock.childBlocks = [];
      newBlock.childBlocksHash = [];
      newBlock.childParts = [];
      newBlock.childPartsHash = [];
      newBlock.childReferences = [];
      newBlock.childReferencesHash = [];
      newBlock.madeByRdf = triple;
      newBlock.madeByRdfChildBlocks = [];
      newBlock.madeByRdfParentBlocks = [];

      var triple = {};
      triple.subject_uri = '<' + newBlockResourceURI + '>';
      triple.predicate_qn = 'rdf:type';
      triple.predicate_uri = '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>';
      triple.object_uri = '<' + newBlockTypeResourceUri + '>';

      newBlock.madeByRdf = triple;
      newBlock.madeByRdfChildBlocks = [];
      newBlock.madeByRdfParentBlocks = [];
      return newBlock;
    }

    function generateAddNewBlockSPARQLStmtObject( newBlock ){
      var sparql_stmts = [];

      var insertion_triple_RDF_TYPE = {};
      insertion_triple_RDF_TYPE.operation = 'insert';
      insertion_triple_RDF_TYPE.subject_uri = newBlock.resourceUri;
      insertion_triple_RDF_TYPE.predicate_uri = 'rdf:type';
      insertion_triple_RDF_TYPE.object_uri = newBlock.typeResourceUri;
      sparql_stmts.push( insertion_triple_RDF_TYPE );

      var insertion_triple_DC_NAME = {};
      insertion_triple_DC_NAME.operation = 'insert';
      insertion_triple_DC_NAME.subject_uri = newBlock.resourceUri;
      insertion_triple_DC_NAME.predicate_uri = 'dc:name';
      insertion_triple_DC_NAME.object_uri = '"' + newBlock.name + '"';
      sparql_stmts.push( insertion_triple_DC_NAME );

      if( newBlock.isSysMLOwns ){
        for (var i = 0; i < newBlock.parentBlocks.length; i++) {
          var stmt = {};
          stmt.operation = 'insert';
          stmt.subject_uri = newBlock.parentBlocks[i].resourceUri ;
          stmt.predicate_uri = 'sysml_block:owns';
          stmt.object_uri = newBlock.resourceUri;
          sparql_stmts.push( stmt );
        };
      }else{
        for (var i = 0; i < newBlock.childParts.length; i++) {
          var stmt = {};
          stmt.operation = 'insert';
          stmt.subject_uri = newBlock.childParts[i].resourceUri ;
          stmt.predicate_uri = 'sysml_block:part';
          stmt.object_uri = newBlock.childParts[i].fifoPartOriginal.shift();
          sparql_stmts.push( stmt );
        };

        for (var i = 0; i < newBlock.childReferences.length; i++) {
          var stmt = {};
          stmt.operation = 'insert';
          stmt.subject_uri = newBlock.childReferences[i].resourceUri ;
          stmt.predicate_uri = 'sysml_block:reference';
          stmt.object_uri = newBlock.resourceUri;
          sparql_stmts.push( stmt );
        };
      }
      return sparql_stmts;
    }

    function generateDeleteBlockSPARQLStmtObject( deletionBlock ){
      var sparql_stmts = [];

      var deletion_triple_RDF_TYPE = {};
      deletion_triple_RDF_TYPE.operation = 'delete';
      deletion_triple_RDF_TYPE.subject_uri = deletionBlock.resourceUri;
      deletion_triple_RDF_TYPE.predicate_uri = 'rdf:type';
      deletion_triple_RDF_TYPE.object_uri = deletionBlock.typeResourceUri;
      sparql_stmts.push( deletion_triple_RDF_TYPE );

      var deletion_triple_DC_NAME = {};
      deletion_triple_DC_NAME.operation = 'delete';
      deletion_triple_DC_NAME.subject_uri = deletionBlock.resourceUri;
      deletion_triple_DC_NAME.predicate_uri = 'dc:name';
      deletion_triple_DC_NAME.object_uri = '"' + deletionBlock.name + '"';
      sparql_stmts.push( deletion_triple_DC_NAME );

      for (var i = 0; i < deletionBlock.parentBlocks.length; i++) {
        var deletion_triple_SYSMS_BLOCK = {};
        deletion_triple_SYSMS_BLOCK.operation = 'delete';
        deletion_triple_SYSMS_BLOCK.subject_uri = deletionBlock.parentBlocks[i].resourceUri ;
        deletion_triple_SYSMS_BLOCK.predicate_uri = 'sysml_block:owns';
        deletion_triple_SYSMS_BLOCK.object_uri = deletionBlock.resourceUri;
        sparql_stmts.push( deletion_triple_SYSMS_BLOCK );
      };

      for (var i = 0; i < deletionBlock.childParts.length; i++) {
        var deletion_triple_SYSMS_BLOCK = {};
        deletion_triple_SYSMS_BLOCK.operation = 'delete';
        deletion_triple_SYSMS_BLOCK.subject_uri = deletionBlock.childParts[i].resourceUri ;
        deletion_triple_SYSMS_BLOCK.predicate_uri = 'sysml_block:part';
        deletion_triple_SYSMS_BLOCK.object_uri = deletionBlock.resourceUri;
        sparql_stmts.push( deletion_triple_SYSMS_BLOCK );
      };
     
      return sparql_stmts;
    }

    $scope.moveBlock = function(sourceNode, targeNode){
      console.log( '$scope.moveBlock' );
      console.log( 'sourceNode' );
      console.log( sourceNode );
      console.log( 'targeNode' );
      console.log( targeNode );
      var copiedSourceNode = angular.copy(sourceNode);
      var movingBlock = sourceNode.block;
      var newOwnerBlock = targeNode.block;
      var oldOwnerBlock = movingBlock.parentBlocks[0];
      changeOwnership(movingBlock, newOwnerBlock, oldOwnerBlock);
    }

    function changeOwnership(movingBlock, newOwnerBlock, oldOwnerBlock){
      var updateStatement = 
      'prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' + 
      'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>  ' +
      'prefix dc: <http://purl.org/dc/elements/1.1/>  ' +
      'prefix sysml: <http://omg/org/sysml/1.3/>  ' +
      'prefix sysml_block: <http://www.example.com/sysml_block/>  ';

      if(oldOwnerBlock !== undefined){
        updateStatement += 
          'delete  where { ' +
        ' ' + oldOwnerBlock.resourceUri  + ' ' +
        ' sysml_block:owns' +
        ' ' + movingBlock.resourceUri + '  ' +
        ' }; ';
      }
      
      updateStatement += 
        'insert {  ' +
        ' ' + newOwnerBlock.resourceUri + ' ' +
        ' sysml_block:owns ' +
        ' ' + movingBlock.resourceUri + '  ' +
        '} where {}; ';

      var operationTitle = 'change ownership';
      addSPARQLUpdateToQueue( updateStatement , operationTitle );
      if( !$scope.isOnTreeSync() ) {
        localf_firePublish(function(){
          localf_reloadTreeFromTriplestore();
        });
        
      }
    }

    function setParentToBlockObject( parentBlock , newBlock ){
      var theParentBlock = $scope.sysmlBlockModel.blockDict[ parentBlock.resourceUri ];
      if(theParentBlock === undefined ){
        $scope.sysmlBlockModel.blocks.push( parentBlock );
        $scope.sysmlBlockModel.blockDict[ parentBlock.resourceUri ] = parentBlock;
        theParentBlock = $scope.sysmlBlockModel.blockDict[ parentBlock.resourceUri ];
      }

      var theNewBlock = $scope.sysmlBlockModel.blockDict[ newBlock.resourceUri ];
      theParentBlock.childBlocks.push( theNewBlock );
      theNewBlock.parentBlocksHash[ theParentBlock.resourceUri ] = theParentBlock;
      theNewBlock.parentBlocks.push( theParentBlock );
    }

    $scope.addNewBlock = function( newBlockResourceURI , newBlockTypeURI , newBlockName, activeNode){
      console.log( '$scope.addNewBlock' );
      console.log( '$scope.addNewBlock newBlockResourceURI : ' + newBlockResourceURI );
      console.log( '$scope.addNewBlock newBlockTypeURI : ' + newBlockTypeURI );
      console.log( '$scope.addNewBlock newBlockName : ' + newBlockName );

      var validate1 = newBlockResourceURI === '';
      var validate2 = !validateURL(newBlockResourceURI);
      var existingBlock = $scope.sysmlBlockModel.blockDict[ '<' + newBlockResourceURI + '>' ]; 
      var validate3 = existingBlock !== undefined ;
      var validate4 = newBlockName === undefined || newBlockName === '' ; 

      if( validate1 ){
        $scope.errorMessage_AddNewBlock = 'Resource URI cannot be empty';
        if(!$scope.isOpenAddNewBlockPanel) $scope.errorMessage = 'Resource URI cannot be empty';
        console.log( $scope.errorMessage_AddNewBlock);
        return;
      }

      if( validate2 ){
        $scope.errorMessage_AddNewBlock = 'Invalid Resource URI';
        if(!$scope.isOpenAddNewBlockPanel) $scope.errorMessage = 'Invalid Resource URI';
        console.log( $scope.errorMessage_AddNewBlock);
        return;
      }

      /*
      if( validate3 ){
        console.log($scope.sysmlBlockModel);
        $scope.errorMessage_AddNewBlock = 'Resource URI "' + newBlockResourceURI + '" is already exist';
        if(!$scope.isOpenAddNewBlockPanel) $scope.errorMessage = 'Resource URI "' + newBlockResourceURI + '" is already exist';
        console.log( $scope.errorMessage_AddNewBlock);
        return;
      }*/

      if( validate4 ){
        $scope.errorMessage_AddNewBlock = 'dc:name cannot be empty';
        if(!$scope.isOpenAddNewBlockPanel) $scope.errorMessage = 'dc:name cannot be empty';
        console.log( $scope.errorMessage_AddNewBlock);
        return;
      }


      $scope.errorMessage = '';
      $scope.errorMessage_AddNewBlock = '';

      console.log( '$scope.addNewBlock - valid arguments' );

      $scope.errorMessage_AddNewBlock = '';

      var newBlock = createAddNewBlockObject( newBlockName , 
                                              newBlockResourceURI , 
                                              newBlockTypeURI  
                                            );

      $scope.sysmlBlockModel.blocks.push( newBlock );
      $scope.sysmlBlockModel.blockDict[ newBlock.resourceUri ] = newBlock;

      if( activeNode !== undefined ){
        if( activeNode.block !== undefined ){
          var parentBlock = activeNode.block;
          setParentToBlockObject( parentBlock , newBlock );
        }
      }
      
      localf_reloadTreeWithRDF( $scope.sysmlBlockModel );
      
      var updateStatement   =   createSparqlUpdateStmt( generateAddNewBlockSPARQLStmtObject( newBlock ) ); 
      var operationTitle    =   'Add new block';
      addSPARQLUpdateToQueue( updateStatement , operationTitle );
      console.log( '$scope.addNewBlock - addSPARQLUpdateToQueue' );
      console.log( 'updateStatement: ' + updateStatement );
      console.log( 'operationTitle: ' + operationTitle) ;
      if( !$scope.isOnTreeSync() )  { 
        localf_firePublish();       
        // UI purpose
        $scope.regenerateResourceUriOfNewBlock();
        $scope.newBlockName = '';
      }
    }

    $scope.regenerateResourceUriOfNewBlock = function(){
      $scope.newBlockResourceURI = 'http://example.com/Block-' + guid();
    }

    function localf_reloadTreeWithRDF( sysmlBlockModel ){
      $scope.rdfModel = localf_convertBlocksToRdf( sysmlBlockModel );
      localf_convertRdfToFusekiTriples(  $scope.rdfModel , function( triples){
        localf_convertTriplesToBlocks( triples  , function( sysmlBlockModel ){
          if( sysmlBlockModel.blocks.length === 0){
            localf_emptySysMLBlockModel();
            localf_uninstallTree();
            $scope.treeErrorMessage = 'Empty model';
          }else{
            $scope.sysmlBlockModel = sysmlBlockModel;
            $scope.rdfModel = localf_convertBlocksToRdf($scope.sysmlBlockModel);
            localf_installTree( $scope.sysmlBlockModel );
            $scope.treeErrorMessage = '';
          }
        });       
      });
    }

    function setupTripleModelAndSparqlUpdateStmtsModel( rdfModel ){
      localf_convertRdfToFusekiTriples( rdfModel , function( triples ){
        $scope.tripleModel = triples;
        generateSPARQLInsertStmtFromTriples( triples , function( updateStatement ){
          $scope.sparqlInsertStmtModel = updateStatement;
        });
      });
    }

    function generateSPARQLInsertStmtFromTriples( triples , callback ){
      var updateStatementsWithoutPrefixes = '';
       localf_convertTriplesToBlocks( triples , function( sysmlBlockModel ){
        
        for (var i = 0; i < sysmlBlockModel.blocks.length; i++) {
          sysmlBlockModel.blocks[i]
          var stmt =  createSparqlUpdateStmtWithoutPrefixes( 
                          generateAddNewBlockSPARQLStmtObject( sysmlBlockModel.blocks[i] ) 
                      );
          updateStatementsWithoutPrefixes += stmt;
        };

        var partAsso;
        for (var i = 0; i < sysmlBlockModel.partAssociations.length; i++) {
          partAsso = sysmlBlockModel.partAssociations[i];

          var stmts = [];

          var stmt1 = {};
          stmt1.operation = 'insert';
          stmt1.subject_uri = partAsso.resourceUri ;
          stmt1.predicate_uri = 'rdf:type';
          stmt1.object_uri = partAsso.typeResourceUri;
          stmts.push( stmt1 );

          var stmt2 = {};
          stmt2.operation = 'insert';
          stmt2.subject_uri = partAsso.resourceUri ;
          stmt2.predicate_uri = 'sysml_block:association_target_block';
          stmt2.object_uri = partAsso.target_block_resourceUri;
          stmts.push( stmt2 );

          var stmt3 = {};
          stmt3.operation = 'insert';
          stmt3.subject_uri = partAsso.resourceUri ;
          stmt3.predicate_uri = 'sysml_block:association_target_title';
          stmt3.object_uri = '"' + partAsso.target_title + '"';
          stmts.push( stmt3 );

          var stmt4 = {};
          stmt4.operation = 'insert';
          stmt4.subject_uri = partAsso.resourceUri ;
          stmt4.predicate_uri = 'sysml_block:association_target_multiplicity';
          stmt4.object_uri = '"' + partAsso.target_multiplicity + '"';
          stmts.push( stmt4 );

          updateStatementsWithoutPrefixes += createSparqlUpdateStmtWithoutPrefixes( stmts );
        };


        var prefixesHeader = '';
        for (var i = 0; i < prefixes.length; i++) {
          prefixesHeader += 'prefix ' + prefixes[i].prefix + ': <' + prefixes[i].uri  + '> ';
        };

        var updateStatements = prefixesHeader + updateStatementsWithoutPrefixes;

        //console.log( 'updateStatements' );
        //console.log( updateStatements );
        callback( updateStatements ) ;
      });
      
    }

    function generateSPARQLDeleteStmtFromTriples( triples , callback ){
      var updateStatementsWithoutPrefixes = '';
      localf_convertTriplesToBlocks( triples , function( sysmlBlockModel ){
        for (var i = 0; i < sysmlBlockModel.blocks.length; i++) {
          sysmlBlockModel.blocks[i]
          var stmt =  createSparqlUpdateStmtWithoutPrefixes( 
                          generateDeleteBlockSPARQLStmtObject( sysmlBlockModel.blocks[i] ) 
                      );
          updateStatementsWithoutPrefixes += stmt;
        };

        var prefixesHeader = '';
        for (var i = 0; i < prefixes.length; i++) {
          prefixesHeader += 'prefix ' + prefixes[i].prefix + ': <' + prefixes[i].uri  + '> ';
        };

        var updateStatements = prefixesHeader + updateStatementsWithoutPrefixes;
        callback( updateStatements );
      });
      
    }

    function addSPARQLUpdateToQueue( updateStatement , operationTitle ){
      var queue = {};
      queue.time = new Date();
      queue.updateStatement = updateStatement;
      queue.status = 'WaitToPublish';
      queue.isPublished = false;
      queue.operationTitle = operationTitle;
      $scope.modelChanges.push( queue );
    }

    $scope.sysmlBlockModel = {};
    
    function localf_convertTriplesToBlocks( triples , callback ){
      console.log( 'FUNC: localf_convertTriplesToBlocks()' );

      var sysmlBlockModel  = {};
      sysmlBlockModel.blocks = [];
      sysmlBlockModel.blockDict = [];
      sysmlBlockModel.partAssociations = [];
      sysmlBlockModel.partAssociationsDict = [];
      sysmlBlockModel.referenceAssociations = [];
      sysmlBlockModel.referenceAssociationsDict = [];

      var parseHelperDict  = {}
      parseHelperDict.dict_sysml_block_association_target_block = [];
      parseHelperDict.dict_sysml_block_association_target_title = [];
      parseHelperDict.dict_sysml_block_association_target_multiplicity = [];
      
      var PARSE_RULE_BLOCK_RESOURCE_TYPE = '<http://omg.org/sysml/Block>';
      var PARSE_RULE_RDF_TYPE = 'rdf:type';
      var PARSE_RULE_BLOCK_NAME = 'dc:name';
      var PARSE_RULE_BLOCK_OWNS = 'sysml_block:owns';
      var PARSE_RULE_BLOCK_PART = 'sysml_block:part';
      var PARSE_RULE_BLOCK_PART_RESOURCE_TYPE = '<http://omg.org/sysml/BlockAssociation/Part>';
      var PARSE_RULE_BLOCK_REFERENCE = 'sysml_block:reference';
      var PARSE_RULE_BLOCK_REFERENCE_RESOURCE_TYPE = '<http://omg.org/sysml/BlockAssociation/Reference>';
      var PARSE_RULE_BLOCK_ASSO_TARGET_BLOCK = 'sysml_block:association_target_block';
      var PARSE_RULE_BLOCK_ASSO_TARGET_TITLE = 'sysml_block:association_target_title';
      var PARSE_RULE_BLOCK_ASSO_TARGET_MULTIPLICITY = 'sysml_block:association_target_multiplicity';
      
      var triple;
      for (var i = 0; i < triples.length; i++) {
        triple = triples[i];

        var isBlock = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_RDF_TYPE.toUpperCase() &&
          triple.object_uri.toUpperCase() === PARSE_RULE_BLOCK_RESOURCE_TYPE.toUpperCase();

        var isPart = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_RDF_TYPE.toUpperCase() &&
          triple.object_uri.toUpperCase() === PARSE_RULE_BLOCK_PART_RESOURCE_TYPE.toUpperCase();

        var isReference = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_RDF_TYPE.toUpperCase() &&
          triple.object_uri.toUpperCase() === PARSE_RULE_BLOCK_REFERENCE_RESOURCE_TYPE.toUpperCase();

        var is_sysml_block_association_target_block = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_ASSO_TARGET_BLOCK.toUpperCase();

        var is_sysml_block_association_target_title = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_ASSO_TARGET_TITLE.toUpperCase();

        var is_sysml_block_association_target_multiplicity = 
          triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_ASSO_TARGET_MULTIPLICITY.toUpperCase();

        if( isBlock ){
          var block = {};
          block.isTreeInstant = false;
          block.parentBlocksAssoHash = [];
          block.resourceName = triple.subject_qn;
          block.resourceUri = triple.subject_uri;
          block.typeResourceUri = triple.object_uri;
          block.typeResourceName = triple.object_qn;
          block.hasParentTree = false;
          block.isSysMLOwns = false;
          block.isPart = false;
          block.isReference = false;
          block.parts = [];
          block.fifoPart = [];
          block.fifoPartOriginal = [];
          block.references = [];
          block.parentBlocksHash = [];
          block.parentBlocks = [];
          block.childBlocks = [];
          block.childBlocksHash = [];
          block.childParts = [];
          block.childPartsHash = [];
          block.childReferences = [];
          block.childReferencesHash = [];
          block.madeByRdf = triple;
          block.madeByRdfChildBlocks = [];
          block.madeByRdfParentBlocks = [];

          sysmlBlockModel.blocks.push( block );
          sysmlBlockModel.blockDict[ block.resourceUri ] = block;

          console.log( block.resourceUri  +  ' > ' + triple.subject_uri);
          console.log( block );

        }else if( isPart ){
          var p = {};
          p.resourceName = triple.subject_qn;
          p.resourceUri = triple.subject_uri;
          p.typeResourceUri = triple.object_uri;
          p.typeResourceName = triple.object_qn;
          p.madeByRdf = triple;

          sysmlBlockModel.partAssociations.push( p );
          sysmlBlockModel.partAssociationsDict[ p.resourceUri ] = p;

        }else if( isReference ){
          var r = {};
          r.resourceName = triple.subject_qn;
          r.resourceUri = triple.subject_uri;
          r.typeResourceUri = triple.object_uri;
          r.typeResourceName = triple.object_qn;
          r.madeByRdf = triple;
         
          sysmlBlockModel.referenceAssociations.push( r );
          sysmlBlockModel.referenceAssociationsDict[ r.resourceUri ] = r;

        }else if( is_sysml_block_association_target_block ){
          parseHelperDict.dict_sysml_block_association_target_block[ triple.subject_uri ] = triple;
       
        }else if( is_sysml_block_association_target_title ){
          parseHelperDict.dict_sysml_block_association_target_title[ triple.subject_uri ] = triple;
       
        }else if( is_sysml_block_association_target_multiplicity ){
          parseHelperDict.dict_sysml_block_association_target_multiplicity[ triple.subject_uri ] = triple;
       
        }else{
          //console.log( 'connot find blocks , partAssociations , referenceAssociations');
        }
      };

      console.log( 'Parsed blocks , partAssociations, referenceAssociations' );
      console.log( sysmlBlockModel );
      console.log( 'parseHelperDict' );
      console.log( parseHelperDict );

      /////////////////////////////////////////////////////////////
      // Set dc:name 
      for (var i = 0; i < triples.length; i++) {
        triple = triples[i];
        if( triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_NAME.toUpperCase() ) {
          var existingBlock = sysmlBlockModel.blockDict[ triple.subject_uri ]; 
          if( existingBlock !== undefined ) existingBlock.name = triple.object_qn;
        }
      };      

      console.log( 'Set dc:name ' );
      console.log( sysmlBlockModel );
      ////////////////////////////////////////////////////////////

      for (var i = 0; i < triples.length; i++) {
        triple = triples[i];

        //console.log( '#### ' + triple.subject_uri + ' ' + triple.predicate_qn + ' ' + triple.object_uri);
        /***************** sysml_block:owns ***************/
        if( triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_OWNS.toUpperCase() ) {

          var existingChildBlock = sysmlBlockModel.blockDict[ triple.object_uri ];
          var existingParentBlock = sysmlBlockModel.blockDict[ triple.subject_uri ]; 
          if(existingParentBlock !== undefined && existingChildBlock !== undefined ){
              existingParentBlock.isSysMLOwns = true;
              existingParentBlock.childBlocks.push( existingChildBlock );
              existingParentBlock.madeByRdfChildBlocks.push( triple );
              existingChildBlock.isSysMLOwns = true;
              existingChildBlock.parentBlocksHash[ existingParentBlock.resourceUri ] = existingParentBlock;
              existingChildBlock.parentBlocks.push( existingParentBlock );
          }

        /***************** sysml_block:part ***************/
        }else if( triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_PART.toUpperCase() ) {

          console.log( 'matched ' + triple.subject_uri + ' sysml_block:part ' + triple.object_uri);

          var block = sysmlBlockModel.blockDict[ triple.subject_uri ]; 
          var partAssociation = sysmlBlockModel.partAssociationsDict[ triple.object_uri ];

          console.log( 'matched ' + PARSE_RULE_BLOCK_PART + ' ' + partAssociation.resourceUri);
          console.log(partAssociation);
          if( block !== undefined && partAssociation !== undefined ){
            
            var partBlock = 
            sysmlBlockModel.blockDict[ 
                parseHelperDict.dict_sysml_block_association_target_block[ 
                          partAssociation.resourceUri 
                ].object_uri 
            ]; 

            var part = {};
            part.resourceUri = partAssociation.resourceUri;
            // sysml_block:association_target_block
            part.target_block_resourceUri = parseHelperDict.dict_sysml_block_association_target_block[ partAssociation.resourceUri ].object_uri;
            part.target_block = partBlock;
            // sysml_block:association_target_title
            part.target_title = 
              parseHelperDict.dict_sysml_block_association_target_title[ partAssociation.resourceUri ].object_uri;
            // sysml_block:association_target_multiplicity
            part.target_multiplicity = 
              parseHelperDict.dict_sysml_block_association_target_multiplicity[ partAssociation.resourceUri ].object_uri;

            part.partParents = [];
            part.partParentsDict = [];
            part.partParents.push( block );
            part.partParentsDict[ block.resourceUri ] = block;

            if( block.parts === undefined ) block.parts = [];
            if( block.partsDict === undefined ) block.partsDict = [];
            block.parts.push( part );
            block.partsDict[ part.resourceUri ] = part;

            partBlock.hasParentTree = true;
            partBlock.isPart = true;
            partBlock.isReference = false;
            partBlock.fifoPartOriginal.push( part ) ;
            partBlock.fifoPart.push( part ) ;
            partBlock.part = part;
            partBlock.name = part.target_block.name;
            partBlock.resourceName = part.target_block.resourceName;
            partBlock.resourceUri = part.target_block.resourceUri;

            //console.log( '>>>>>>>>>>>>>>>>>>> ' + PARSE_RULE_BLOCK_PART );
            //console.log( partBlock.name );
           
            var partAsso = sysmlBlockModel.partAssociationsDict[ 
                    parseHelperDict.dict_sysml_block_association_target_block[ 
                          partAssociation.resourceUri 
                    ].subject_uri 
                ];

            partAsso.target_title = part.target_title;
            partAsso.target_block_resourceUri = part.target_block_resourceUri;
            partAsso.target_multiplicity = part.target_multiplicity;

            partAssociation.target_title = part.target_title;
            partAssociation.target_block_resourceUri = part.target_block_resourceUri;
            partAssociation.target_multiplicity = part.target_multiplicity;

            console.log( 'BBBB ' + partAssociation.resourceUri );
            console.log( partAssociation );

            block.childParts.push( partBlock );
            block.childPartsHash[ partBlock.resourceUri ] = partBlock;

            partBlock.parentBlocks.push( block );
            partBlock.parentBlocksHash[ block.resourceUri ] = block;
            partBlock.parentBlocksAssoHash[ block.resourceUri ] = 'part';

          }

        /***************** sysml_block:reference ***************/
        }else if( triple.predicate_qn.toUpperCase() === PARSE_RULE_BLOCK_REFERENCE.toUpperCase() ) {

          var block                 =   sysmlBlockModel.blockDict[ triple.subject_uri ]; 
          var referenceAssociation  =   sysmlBlockModel.referenceAssociationsDict[ triple.object_uri ];
          if( block !== undefined && referenceAssociation !== undefined ){
            
            var referenceBlock = 
                      sysmlBlockModel.blockDict[ 
                              parseHelperDict.dict_sysml_block_association_target_block[ 
                                    referenceAssociation.resourceUri 
                              ].object_uri 
                  ]; 
              
            var reference = {};
            reference.resourceUri = referenceAssociation.resourceUri;
            reference.target_block_resourceUri = 
                parseHelperDict.dict_sysml_block_association_target_block[ 
                        referenceAssociation.resourceUri 
                ].object_uri;
            reference.target_block = referenceBlock;
            reference.target_title = 
                parseHelperDict.dict_sysml_block_association_target_title[ 
                        referenceAssociation.resourceUri 
                ].object_uri;
            reference.target_multiplicity = 
                parseHelperDict.dict_sysml_block_association_target_multiplicity[ 
                        referenceAssociation.resourceUri 
                ].object_uri;
              
            reference.partParents                           = [];
            reference.partParentsDict                       = [];
            reference.partParentsDict[ block.resourceUri ]  = block;
            reference.partParents.push( block );

            referenceBlock.hasParentTree            = true;
            referenceBlock.isPart                   = false;
            referenceBlock.isReference              = true;
            referenceBlock.reference                = reference;
            referenceBlock.name                     = reference.target_block.name;
            referenceBlock.resourceName             = reference.target_block.resourceName;
            referenceBlock.resourceUri              = reference.target_block.resourceUri;
            referenceBlock.madeByRdf                = triple;
            referenceBlock.madeByRdfChildBlocks     = [];
            referenceBlock.madeByRdfParentBlocks    = [];

            var referenceAsso = sysmlBlockModel.referenceAssociationsDict[ 
                    parseHelperDict.dict_sysml_block_association_target_block[ 
                          referenceAssociation.resourceUri 
                    ].subject_uri 
                ];
            referenceAsso.target_title = reference.target_title;
            referenceAsso.target_block_resourceUri = reference.target_block_resourceUri;
            referenceAsso.target_multiplicity = reference.target_multiplicity;

            referenceAssociation.target_title = reference.target_title;
            referenceAssociation.target_block_resourceUri = reference.target_block_resourceUri;
            referenceAssociation.target_multiplicity = reference.target_multiplicity;


            if( block.references === undefined ) block.references = [];
            if( block.referencesDict === undefined ) block.referencesDict = [];

            block.references.push( reference );
            block.referencesDict[ reference.resourceUri ] = reference;

            block.childReferences.push( referenceBlock );
            block.childReferencesHash[ referenceBlock.resourceUri ] = referenceBlock;

            referenceBlock.parentBlocks.push( block );
            referenceBlock.parentBlocksHash[ block.resourceUri ] = block;
            referenceBlock.parentBlocksAssoHash[ block.resourceUri ] = 'reference';
          }
        }
      }

      console.log( 'Parsed entire RDF' );
      console.log( sysmlBlockModel );
      callback( sysmlBlockModel );
    }

    function localf_installTreeFromRdf( rdfModel ){
      $scope.clearNodeName();
      $rootScope.processLabel = $http.post( '/parse_rdfxml' , { "content" : rdfModel , "prefixesOfInterest" : prefixes} ).
        success(function( parsedData, status, headers, config) {      
          if( parsedData.isError ){
            alert( 'Found error: ' + parsedData.errorMessage);
            localf_emptySysMLBlockModel();
            localf_uninstallTree();
          }else{
            if( parsedData.triples.length > 0){
              localf_convertTriplesToBlocks( parsedData.triples ,function( sysmlBlockModel ){
                $scope.sysmlBlockModel = sysmlBlockModel;
                localf_installTree( $scope.sysmlBlockModel );
              });
            }else{
              
              localf_emptySysMLBlockModel();
              localf_uninstallTree();
            }
          } 
        }).
        error(function(data, status, headers, config) {
          localf_emptySysMLBlockModel();
          localf_uninstallTree();
          alert( 'Cannot connect to web services' );
        });
    }


});


