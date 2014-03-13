/*
* DataloaderWidget.js
*
* Copyright (c) 2013, Sebastian Kruse. All rights reserved.
*
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU Lesser General Public
* License as published by the Free Software Foundation; either
* version 3 of the License, or (at your option) any later version.
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
* Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
* MA 02110-1301  USA
*/

/**
 * @class DataloaderWidget
 * DataloaderWidget Implementation
 * @author Sebastian Kruse (skruse@mpiwg-berlin.mpg.de)
 *
 * @param {WidgetWrapper} core wrapper for interaction to other widgets
 * @param {HTML object} div parent div to append the Dataloader widget div
 * @param {JSON} options user specified configuration that overwrites options in DataloaderConfig.js
 */
DataloaderWidget = function(core, div, options) {

	this.core = core;
	this.core.setWidget(this);

	this.options = (new DataloaderConfig(options)).options;
	this.gui = new DataloaderGui(this, div, this.options);
	
	this.dataLoader = new Dataloader(this);
}

DataloaderWidget.prototype = {

	initWidget : function() {

		var dataloaderWidget = this;
	},

	highlightChanged : function(objects) {
		if( !GeoTemConfig.highlightEvents ){
			return;
		}
	},

	selectionChanged : function(selection) {
		if( !GeoTemConfig.selectionEvents ){
			return;
		}
	},

	triggerHighlight : function(item) {
	},

	tableSelection : function() {
	},

	deselection : function() {
	},

	filtering : function() {
	},

	inverseFiltering : function() {
	},

	triggerRefining : function() {
	},

	reset : function() {
	},
	
	loadFromURL : function() {
		var dataLoaderWidget = this;
		//using jQuery-URL-Parser (https://github.com/skruse/jQuery-URL-Parser)
		var datasets = [];
		$.each($.url().param(),function(paramName, paramValue){
			//startsWith and endsWith defined in SIMILE Ajax (string.js)
			var fileName = dataLoaderWidget.dataLoader.getFileName(paramValue);
			var origURL = paramValue;
			if (typeof dataLoaderWidget.options.proxy != 'undefined')
				paramValue = dataLoaderWidget.options.proxy + paramValue;
			if (paramName.toLowerCase().startsWith("kml")){
				var kmlDoc = GeoTemConfig.getKml(paramValue);
				var dataSet = new Dataset(GeoTemConfig.loadKml(kmlDoc), fileName, origURL);
				if (dataSet != null){
					var datasetID = parseInt(paramName.substr(3));
					if (!isNaN(datasetID)){
						datasets[datasetID] = dataSet;
					} else {
						datasets.push(dataSet);							
					}
				}
			}
			else if (paramName.toLowerCase().startsWith("csv")){
				var json = GeoTemConfig.getCsv(paramValue);
				var dataSet = new Dataset(GeoTemConfig.loadJson(json), fileName, origURL);
				if (dataSet != null){
					var datasetID = parseInt(paramName.substr(3));
					if (!isNaN(datasetID)){
						datasets[datasetID] = dataSet;
					} else {
						datasets.push(dataSet);							
					}
				}
			}
			else if (paramName.toLowerCase().startsWith("json")){
				var json = GeoTemConfig.getJson(paramValue);
				var dataSet = new Dataset(GeoTemConfig.loadJson(json), fileName, origURL);
				if (dataSet != null){
					var datasetID = parseInt(paramName.substr(4));
					if (!isNaN(datasetID)){
						datasets[datasetID] = dataSet;
					} else {
						datasets.push(dataSet);							
					}
				}
			}
			else if (paramName.toLowerCase().startsWith("local")){
				var csv = $.remember({name:encodeURIComponent(origURL)});
				//TODO: this is a bad idea and will be changed upon having a better
				//usage model for local stored data
				var fileName = origURL.substring("GeoBrowser_dataset_".length);
				var json = GeoTemConfig.convertCsv(csv);
				var dataSet = new Dataset(GeoTemConfig.loadJson(json), fileName, origURL, "local");
				if (dataSet != null){
					var datasetID = parseInt(paramName.substr(5));
					if (!isNaN(datasetID)){
						datasets[datasetID] = dataSet;
					} else {
						datasets.push(dataSet);							
					}
				}
			}
		});
		$.each($.url().param(),function(paramName, paramValue){
			//startsWith and endsWith defined in SIMILE Ajax (string.js)
			if (paramName.toLowerCase().startsWith("filter")){
				var datasetID = parseInt(paramName.substr(6));
				var dataset;
				if (isNaN(datasetID)){
					var dataset;
					for (datasetID in datasets){
						break;
					}
				}
				dataset = datasets[datasetID];
				
				if (typeof dataset === "undefined")
					return;
				
				var filterValues = function(paramValue){
					var filter = JSON.parse(paramValue);
					var filteredObjects = [];
					for(var i = 0; i < dataset.objects.length; i++){
						var dataObject = dataset.objects[i];
						if ($.inArray(dataObject.index,filter) != -1){
							filteredObjects.push(dataObject);
						}
					}
					var filteredDataset = new Dataset(filteredObjects, dataset.label + " (filtered)", dataset.url, dataset.type);
					datasets.push(filteredDataset);
				}
				
				if (paramValue instanceof Array){
					for (var i=0; i < paramValue.length; i++){
						filterValues(paramValue[i]);
					}
				} else {
					filterValues(paramValue);
				}

			}
		});
		//Load the (optional!) dataset colors
		$.each($.url().param(),function(paramName, paramValue){
			if (paramName.toLowerCase().startsWith("color")){
				//color is 1-based, index is 0-based!
				var datasetID = parseInt(paramName.substring("color".length))-1;
				if (datasets.length > datasetID){
					if (typeof datasets[datasetID].color === "undefined"){
						var color = new Object();
						var colorsSelectedUnselected = paramValue.split(",");
						if (colorsSelectedUnselected.length > 2)
							return;
						
						var color1 = colorsSelectedUnselected[0];
						if (color1.length != 6)
							return;
						
						color.r1 = parseInt(color1.substr(0,2),16);
						color.g1 = parseInt(color1.substr(2,2),16);
						color.b1 = parseInt(color1.substr(4,2),16);
						
						//check if a unselected color is given
						if (colorsSelectedUnselected.length == 2){
							var color0 = colorsSelectedUnselected[1];
							if (color0.length != 6)
								return;
							
							color.r0 = parseInt(color0.substr(0,2),16);
							color.g0 = parseInt(color0.substr(2,2),16);
							color.b0 = parseInt(color0.substr(4,2),16);
						} else {
							//if not: use the selected color "halved"
							color.r0 = Math.round(color.r1/2);
							color.g0 = Math.round(color.g1/2);
							color.b0 = Math.round(color.b1/2);
						}
						
						datasets[datasetID].color = color;
					}	
				}
			}	
		});
		//delete undefined entries in the array
		//(can happen if the sequence given in the URL is not complete
		// e.g. kml0=..,kml2=..)
		//this also reorders the array,	 starting with 0
		var tempDatasets = [];
		for(var index in datasets){
			if (datasets[index] instanceof Dataset){
				tempDatasets.push(datasets[index]);
			}
		}
		datasets = tempDatasets;
		
		if (datasets.length > 0)
			dataLoaderWidget.dataLoader.distributeDatasets(datasets);
	}
};
