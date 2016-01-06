/*********************************************************************************************
 * Copyright (c) 2015  Georgia Institute of Technology.
 *
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the BSD 3-Clause License
 *  which accompanies this distribution. The BSD 3-Clause License is 
 *  available at https://opensource.org/licenses/BSD-3-Clause
 *  
 *******************************************************************************************/

(function() {
  jQuery.noConflict();
  var originalStringify = JSON.stringify;
  JSON.stringify = function(obj) {
    var seen = [];

    var result = originalStringify(obj, function(key, val) {
      if (val instanceof HTMLElement) { return val.outerHTML }
      if (typeof val == "object") {
        if (seen.indexOf(val) >= 0) { return "[Circular]"; }
        seen.push(val);
      }
      return val;
    });
    return result;
  };
})();


var jqueryFuncs = (function () {
  "use strict";
   return {
      test: (function () {
        return 'test';
      }()),
      clear: (function () {
        clear();
      }),
      getSelectNodeId: (function () {
        return selected_node_id;
      }),
      getAllNode: (function () {
        return easytree.getAllNodes();
      }),
      setNodeName: (function ( newNodeName ) {
        setNodeName( newNodeName );
      }),
      addNode: (function ( nodes ) {
        addNodeManually( nodes );
      }),
      removeNodeByName: (function (name) {
        removeNodeByName(name);
      }),
      deleteAllNodes: (function () {
        deleteAllNodes();
      }),
      unsetNodeSelection: (function () {
        unsetNodeSelection();
      }),
      unfoldAll: (function () {
        unfoldAll();
      }),
      foldAll: (function () {
        foldAll();
      }),
      refresh: (function () {
        easytree.rebuildTree();
      })
   };
}());

var selected_node_id = 0; // This var will be set when the user click a node item

function unsetNodeSelection(){
  selected_node_id = 0;
} 

function setNodeName( newNodeName ){
  console.log( 'setNodeName: newNodeName = ' + newNodeName );
  console.log( 'selected_node_id : ' + selected_node_id );
  var ableToProcess = selected_node_id != 0 && newNodeName !== '';
  console.log( 'ableToProcess: ' + ableToProcess); 
  if( ableToProcess ){
    var node = easytree.getNode( selected_node_id );
    node.text = newNodeName;
    var scope = angular.element(document.getElementById("controller")).scope();
    scope.$apply(function () {
      scope.makeTree();
    });
  }
}

function addNodeManually( nodes ){
  easytree.addNode( nodes , selected_node_id );
  easytree.rebuildTree();
} 

function addNode(){
  var sourceNode = {};
  sourceNode.text = jQuery('#new_node_text').val();
  sourceNode.isFolder = jQuery('#newNodeIsFolder').is(":checked");
  easytree.addNode(sourceNode, selected_node_id );
  easytree.rebuildTree();
} 

function addNodeWithFolder(){
  var sourceNode = {};
  sourceNode.text = jQuery('#new_node_text').val();
  sourceNode.isFolder = true;
  easytree.addNode(sourceNode, selected_node_id );
  easytree.rebuildTree();
} 


function removeNodeByName( name ){
  var nodes = easytree.getAllNodes();
  for (var i = 0; i < nodes.length; i++) {
    if( nodes[i].text == name){
      easytree.removeNode(nodes[i].id);
    }
  } 
  easytree.rebuildTree(); 
} 

function removeNode(){
  var result = confirm("Want to delete?");
  if (result) {
      var node = easytree.getNode( selected_node_id );
      if (!node) { return; }
      easytree.removeNode(node.id);
      easytree.rebuildTree();
  }
} 

function dropped(event, nodes, isSourceNode, source, isTargetNode, target) {
    if (isSourceNode && target && (!isTargetNode && (target.id == 'drag_n_drop_area'))) {
      jQuery('#drag_n_drop_area').append('<p>' + source.text + '</p>')
    }
}

var escapeE = document.createElement('textarea');

function escapeHTML( input ){
  escapeE.textContent = input;
  return escapeE.innerHTML;
}

function removeUnwantedSymbolInRDF( input ){
  if( input !== undefined ){
    input = input.replace( '>' , '');
    input = input.replace( '<' , '');
    return input;
  }
}  

function convertBlockToTriple( block ){

  var sysml_block_owns_lines = '';
  for (var i = 0; i < block.childBlocks.length; i++) {
    var childBlock = block.childBlocks[i];
    sysml_block_owns_lines += block.resourceUri + '  sysml_block:owns  ' + childBlock.resourceUri  + ' \n';
  };

  var triple = 
  block.resourceUri  + '  rdf:type  ' + block.typeResourceUri + ' \n' +  
  block.resourceUri  + '  dc:name   ' + block.name + ' \n' +  
  sysml_block_owns_lines;

  return triple;
}

function convertBlockToRdf( block ){

  var sysml_block_owns_lines = '';
  for (var i = 0; i < block.childBlocks.length; i++) {
    var childBlock = block.childBlocks[i];
    sysml_block_owns_lines += '   <sysml_block:owns rdf:resource="' + removeUnwantedSymbolInRDF( childBlock.resourceUri )  + '"/> \n';
  };

  var rdf = 
  '<rdf:Description rdf:about="' + removeUnwantedSymbolInRDF( block.resourceUri ) + '"> \n' +  
  '   <dc:name>' + block.name + '</dc:name> \n' +  
  '   <rdf:type rdf:resource="' + removeUnwantedSymbolInRDF( block.typeResourceUri ) + '"/>  \n' +  
  sysml_block_owns_lines + 
  '</rdf:Description> \n';

  return rdf;
}

function clear(){
  jQuery('#activeNode').val('');
  jQuery('#targetLevel').val('');
  jQuery('#parentBlock').val('');
  jQuery('#active_rdf').html('');
  jQuery('#active_triple').html('');
  unsetNodeSelection();
  easytree.activateNode(null);
}
function stateChangedEvent(nodes, nodesJson) {
    selected_node_id = jQuery( "span.easytree-active" ).attr('id');
    if(selected_node_id === undefined ) selected_node_id = 0;
    if(easytree && selected_node_id != 0){
      
      var node = easytree.getNode( selected_node_id );
      console.log('selected node > ');
      console.log(node);
      jQuery('#activeNode').val( node.block.name );
      jQuery('#parentBlock').val( node.text + ' ' + node.madeByRdf.subject_uri );
      jQuery('#active_triple').html( escapeHTML( convertBlockToTriple( node.block ) ) );
      var scope = angular.element(document.getElementById("controller")).scope();
      scope.$apply(function () {
        scope.setActiveNode( node );
        scope.setActiveNodeRdf( convertBlockToRdf( node.block ) );
      });
    }   
}

function unfoldAll() {
    var nodes = easytree.getAllNodes();
    toggleNodes(nodes, 'open');
    easytree.rebuildTree(nodes);
}

function foldAll() {
    var nodes = easytree.getAllNodes();
    toggleNodes(nodes, 'close');
    easytree.rebuildTree(nodes);
}

function toggleNodes(nodes, openOrClose){
    var i = 0;
    for (i = 0; i < nodes.length; i++) {
        nodes[i].isExpanded = openOrClose == "open"; // either expand node or don't
        if (nodes[i].children && nodes[i].children.length > 0) {
            toggleNodes(nodes[i].children, openOrClose);
        }
    }
}

function deleteAllNodes(){
  var nodes = [];
  easytree.rebuildTree( nodes );
}

function dropped(event, nodes, isSourceNode, source, isTargetNode, target) {
    //if (isSourceNode && target && (!isTargetNode && (target.id == 'drag_n_drop_area'))) {
      //jQuery('#drag_n_drop_area').append('<p>' + source.text + '</p>');
    console.log('event');
    console.log(event);
    console.log('nodes');
    console.log(nodes);
    console.log('isSourceNode: ' + isSourceNode);
    console.log('source');
    console.log(source);
    console.log('isTargetNode: ' + isTargetNode);
    console.log('target');
    console.log(target);

    var scope = angular.element(document.getElementById("controller")).scope();
    scope.$apply(function () {
        scope.moveBlock( source , target);
    });
    //}
}


var easytree = jQuery('#tree_model').easytree({
    enableDnd: true,
    dropped: dropped,
    stateChanged: stateChangedEvent
});

jQuery(document).ready(function () {

});