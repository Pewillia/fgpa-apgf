import Flow from '@flowjs/ng-flow/dist/ng-flow-standalone';
// extenString

import regeneratorRuntime from "regenerator-runtime"
//const regeneratorRuntime = require("regenerator-runtime");


const xjs = require('xml2js');

const FileSaver = require('file-saver');

window.Flow = Flow;

const templateUrls = {
    header: require('./header.html'),
    save: require('./save-dialog.html'),
    help: require('./help-dialog.html'),
    error: require('./error-dialog.html'),
    preview: require('./preview-dialog2.html'),  // added for preview ???
    search: require('./search-dialog.html')

}

/**
 * @module avHeader
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `avHeader` directive holds the header logic of create, load and save config file. It is also responsible
 * for language switch
 *
 */
angular
    .module('app.ui')
    .directive('avHeader', avHeader);

/**
 * `avHeader` directive body.
 *
 * @function avHeader
 * @return {Object} directive body
 */
function avHeader() {
    const directive = {
        restrict: 'E',
        templateUrl: templateUrls.header,
        scope: { },
        controller: Controller,
        controllerAs: 'self',
        bindToController: true
    };

    return directive;
}

/**
 * Header controller
 *
 * @function Controller
 * @param {Object} $q Angular promise object
 * @param {Object} $mdDialog, Angular mddialog window object
 * @param {Object} $timeout Angular timeout object
 * @param {Object} $rootElement Angular rootelement object
 * @param {Object} $http Angular http object
 * @param {Object} events Angular events object
 * @param {Object} modelManager service to manage Angular Schema Form model
 * @param {Object} commonService service with common functions
 * @param {Object} constants service with all constants for the application
 * @param {Object} helpService service to create help

 *///added $scope feb 13 2019


// function Controller($scope, $translate, $timeout,
  //  events, modelManager, stateManager, formService, debounceService, constants, layerService, commonService) {


//function Controller($scope, $q, $mdDialog, $timeout, $rootElement, $http, events, modelManager, stateManager, commonService, constants, helpService) {
function Controller($scope, $q, $mdDialog, $timeout, $rootElement, $http, events, modelManager, stateManager, commonService, constants, helpService, formService, debounceService, layerService) {
    'ngInject';
    const self = this;

    self.create = create;
    self.filesSubmitted = filesSubmitted;
    self.save = save;
    self.search = search;
    self.help = help;
    self.setLanguage = setLanguage;
    self.setTemplate = setTemplate;

    // get all available languages and set the first one as current
    self.languages = commonService.getLangs();
    self.language = self.languages[0];
    localStorage.setItem('fgpa-lang', self.language);

    // get all value for templateUrls
    self.templates = getTemplates();
    self.template = (self.templates.length > 0) ?
        self.templates[0] : { 'path': 'config-default.json', 'file': 'default' };

    // set active file name
    events.$on(events.avNewSaveName, (obj, name)  => { self.saveName = name });
// added pw mar 20
// when schema is loaded or create new config is hit, initialize the schema, form and model


/**   all the below is init layer stuff from map directive**/



/**   all he above is init layer stuff from map directive**/

    /**
     * When create is clicked, broadcast a newModel event
     *
     * @function create
     * @private
     */
    function create() {
        // show splash with update event as parameter
        events.$broadcast(events.avShowSplash, events.avSchemaUpdate);

        // set active file name
        self.saveName = self.template.file;
    }

    /**
     * Open the help dialog
     *
     * @function help
     * @private
     */
    function help() {
        helpService.open();
    }

    /**
     * Set the current language
     *
     * @function setLanguage
     * @private
     */
    function setLanguage() {
        commonService.setLang(self.language);
        localStorage.setItem('fgpa-lang', self.language);
    }

    /**
     * Get templates available for the user from data-av-config attribute on html page
     *
     * @function getTemplates
     * @private
     * @return {Array} templates templates available for the user
     */
    function getTemplates() {
        const configAttr = $rootElement.attr('data-av-config');
        let templates = [];

        if (typeof configAttr !== 'undefined') {
            angular.fromJson(configAttr).map(item => {
                templates.push({ 'path': item, 'file': item.split('/')[item.split('/').length - 1].split('.')[0] });
            });
        }

        return templates;
    }

    /**
     * Set the current template
     *
     * @function setTemplate
     * @private
     */
    function setTemplate() {
        // load selected configuration and create the new file
        $http.get(self.template.path).then(obj => {
            modelManager.setDefault(obj.data);
            self.create();
        });
    }

    /**
     * Starts file upload.
     *
     * @function filesSubmitted
     * @private
     * @param {Array} files uploaded array of files
     */
    function filesSubmitted(files) {
        if (files.length > 0) {
            // show splash when new model load
            events.$broadcast(events.avShowSplash);

            // set active file name
            self.saveName = files[0].name.replace('.json', '');

            // read the file but add a timeout for the animation to start
            const file = files[0];
            $timeout(() => {
                _readFile(file.file).then(data => {
                    modelManager.setModels(JSON.parse(data));

                    // Validate data here check conformity with actual used schema
                    // TODO Upgrade to actual version. Strip non-conform object

                }).catch(error => {
                    $mdDialog.show({
                        controller: ErrorController,
                        controllerAs: 'self',
                        templateUrl: templateUrls.error,
                        parent: $('.fgpa'),
                        clickOutsideToClose: true,
                        fullscreen: false,
                        onRemoving: () => { document.getElementsByClassName('av-load-button')[0].focus(); }
                    });

                    function ErrorController($mdDialog) {
                        'ngInject';
                        const self = this;

                        self.close = $mdDialog.hide;
                        self.cancel = $mdDialog.hide;
                        self.errorMessage = error;
                    }
                });
            }, constants.delayEventSplash);
        }


        /**
         * Reads HTML5 File object data.
         *
         * @function _readFile
         * @private
         * @param {File} file a file object to read
         * @param {Function} progressCallback a function which is called during the process of reading file indicating how much of the total data has been read
         * @return {Promise} promise resolving with file's data
         */
        function _readFile(file) {
            const dataPromise = $q((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => {
                    reject('Failed to read a file');
                };
                reader.onload = () =>
                    resolve(reader.result);

                reader.readAsText(file);
            });

            return dataPromise;
        }
    }

    /**
     * Open a dialog window to save current model
     *
     * @function save
     * @private
     */
    function save() {
        // FIXME: we can't know the real saved file name because FileSaver.onwriteend doesn/t workaround
        // so if there is duplicate name the name will become nyname(1) on disk but will be myname on display
        $mdDialog.show({
            controller: SaveController,
            controllerAs: 'self',
            templateUrl: templateUrls.save,
            parent: $('.fgpa'),
            clickOutsideToClose: true,
            fullscreen: false,
            locals: { name: self.saveName },
            onRemoving: element => {
                self.saveName = document.getElementById('avInputFileSaveName').value;
                document.getElementsByClassName('av-save-button')[0].focus();
            }
        });
    }

    /**
     * save controller
     *
     * @function SaveController
     * @private
     * @param  {Object} $mdDialog  Angular dialog window object
     * @param  {Object} $translate  Angular translation object
     * @param {Object} constants service with all constants for the application
     * @param {String} name previous file save name
     */
    function SaveController($mdDialog, $translate, constants, name) {
        'ngInject';
        const self = this;

        self.close = $mdDialog.hide;
        self.cancel = cancel;
        self.save = save;
        self.error = '';
        self.isError = false;

        // increment final name from existing file name
        self.fileName = (name.search('^.*-V[0-9][0-9]$') === 0) ?
            `${name.slice(0, -2)}${(parseInt(name.slice(-2)) + 1).toString().padStart(2, '0')}` : `${name}-V01`;

        /**
         * Save current models to file
         *
         * @function save
         * @private
         */
        function save() {
            try {
                // save the file. Some browsers like IE and Edge doesn't support File constructor, use blob
                // https://stackoverflow.com/questions/39266801/saving-file-on-ie11-with-filesaver
                const file = new Blob([modelManager.save()], { type: 'application/json' });
                FileSaver.saveAs(file, `${self.fileName}.json`);

                self.close();
            } catch (e) {
                self.error = $translate.instant('header.savedialog.error');
                self.isError = true;
                document.getElementsByClassName('av-savedialog-cancel')[0].focus();
            }
        }

        /**
         * Cancel save action.
         *
         * @function cancel
         * @private
         */
        function cancel() {
            // set back the original name for save file name to be not changed
            document.getElementById('avInputFileSaveName').value = name;
            self.close();
        }
    }




    function search() {
        // FIXME: we can't know the real saved file name because FileSaver.onwriteend doesn/t workaround
        // so if there is duplicate name the name will become nyname(1) on disk but will be myname on display
         console.log ("in search..1......................");
         //         this.dialog.open(search, {height: '11900px',width: '11900px'
        //                                  }
        //                         );

        $mdDialog.show({
            controller: SearchController,
            controllerAs: 'self',
            templateUrl: templateUrls.search,
            parent: $('.fgpa'),
            clickOutsideToClose: true,
            fullscreen: true,
            multiple: true,
        //    locals: { name: self.search },
            locals: { name: "1" },
          onRemoving: element => {
                self.saveName = document.getElementById('avSearchName').value;
                document.getElementsByClassName('av-search-button')[0].focus();
            }
        });
    }




    function findObjectByLabel ( obj, label ) {
    // console.log('findobject bylabel');
   //console.log('label ='+label);
              window.val ="";
            for ( let  elements in obj) {
             // condition needed for jslint
             if (elements.typeof === undefined ) {

                 if (elements === label){
                     console.log(' found label');
                     console.log(obj[elements]);
                     console.log('value of obj[elements]=', typeof (obj[elements]),obj[elements]);
                    if (typeof(window.val) === undefined){
                       console.log('windws.val undefined');
                       //converts to string if don't do this
                      window.val = Array.from(obj[elements]);}
                    else  {
                      console.log('windws.val is defined',typeof(window.val));
                        window.val = Array.from(window.val);
                        //converts to string - untested branch  as of yet
                      window.val = window.val.concat(obj[elements]);
                      console.log('windws.val 2 is defined',typeof(window.val));

                               }
          //           self.Categories = obj[elements];
                     return (obj[elements]); }
                   //  recursive call
                     if(typeof obj[elements] === 'object') {
                           console.log('doing recursive call');
                        findObjectByLabel(obj[elements], label);
                                                         }
                    }
            }
      }

    /**
     * save controller
     *
     * @function SearchStatusController
     * @private
     * @param  {Object} $mdDialog  Angular dialog window object
     * @param  {Object} $translate  Angular translation object
     * @param {Object} constants service with all constants for the application
     * @param {String} name previous file save name
     */
    function SearchController($mdDialog, $translate, constants, name) {
        'ngInject';
        const self = this;

    //    self.close = $mdDialog.hide;
  //      self.cancel = cancel;
//      self.search = search;
      //  self.error = '';
  //      self. = false;
  //      self.searchText ='';

          initvars();

      //  self.fileName = (name.search('^.*-V[0-9][0-9]$') === 0) ?
    //        `${name.slice(0, -2)}${(parseInt(name.slice(-2)) + 1).toString().padStart(2, '0')}` : `${name}-V01`;
        let file = new XMLHttpRequest();
    // async open call https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml

// works to query catalogue
  //  file.open('POST', 'https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw', true);
    //file.setRequestHeader('Content-type', 'application/xml');

    //  file.open('POST', 'https://160.106.128.113', true);
    //  file.setRequestHeader('Content-type', 'application/xml');

   //rcs call to tet rcsdev , not sure all i'd are in, add id at end and returns info
  //  file.open('GET',  '//160.106.128.113/v2/doc/en/0', true);
  //   file.send();

  // file.open('GET',   'https://internal.rcs.csw.open.canada.ca', true);
  //   file.open('GET', 'https://internal.rcs.csw.open.canada.ca/jstest', true);
  //file.send('GET /v2/doc/EN');

  //file.send('/v2/doc/en/0');

   //  query to get doain values for titles
//    <?xml version="1.0"?>
//    <csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">
//        <csw:PropertyName>Title</csw:PropertyName>
//    </csw:GetDomain>

//

  //  file.open('POST', 'https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml', true);
  //  file.send('https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml');
    //file.send('');

// works with GET
//    file.open('GET', 'https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml', true);
//     file.send();

// Getcapabilities
//    file.send('<?xml version="1.0"?>'+
//'<csw:GetCapabilities xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW">'+
//    '<ows:AcceptVersions xmlns:ows="http://www.opengis.net/ows" >'+
//    '    <ows:Version>2.0.2</ows:Version>'+
//    '</ows:AcceptVersions>'+
//        '<ows:AcceptFormats xmlns:ows="http://www.opengis.net/ows">'+
//    '    <ows:OutputFormat>application/xml</ows:OutputFormat>'+
//    '</ows:AcceptFormats>'+
 //'</csw:GetCapabilities>');
//
function initvars() {
  self.searchSubject ='';
  self.Categories = [];
  self.Categories2 = [];
  self.Subject = [];
  self.Abstract = [];
  self.Graphic = [];
  self.URL = [];
  //self.Layers =[];
   self.nodecount =0;
  self.searchTitles = searchTitles;
  self.searchTitles2 = searchTitles2;
  self.getAbstract = getAbstract;
  self.Identifier = '';
  // added or preview ???
      self.openPreview = openPreview;
      self.previewReady = previewReady;
      self.saveUrl = saveUrl;

      self.selection =[];
      self.idx=0;
      self.toggleSelection = toggleSelection;
      self.selectAll=selectAll;
      self.removeAll=removeAll;
      self.saveLayers=saveLayers;
}
/**
 * Set local storage viewerversion parameter
 *
 * @function setLocalVersion
 * @private
 */
function setLocalVersion() {
    localStorage.setItem('viewerversion', modelManager.getModel('version', false).version);
    localStorage.setItem('viewerenv', modelManager.getModel('version', false).version === '2.5.0-0726' ? 'dev' : '');
}

/**
 * Check if preview can be done
 *
 * @function previewReady
 * @private
 * @return {Boolean} true if ready and false if not
 */
function previewReady() {
    return stateManager.goNoGoPreview();
}

/**
 * Open a dialog window to show current configuration
 *
 * @function openPreview
 * @private
 */
function openPreview() {

  //  validateForm();
//  console.log('in open preview');

    if (stateManager.goNoGoPreview()) {
    //  console.log('in state manager open preview');

        // set the config to use by the preview window/iFrame
        localStorage.setItem('configpreview', modelManager.save(true));

        // set the array of languages to use by the preview window/iFrame
        const langs = commonService.setUniq([commonService.getLang()].concat(commonService.getLangs()));
        localStorage.setItem('configlangs', `["${langs.join('","')}"]`);

//  just added feb 20 to finish adn set key vale from gloabal identfiier variable
      //  self.Identifier = "ce7873ff-fbc0-4864-946e-6a1b4d739154";
        localStorage.setItem('configkeys', `["${self.Identifier}"]`);

      // set the viewer version to use by the preview window/iFrame

        setLocalVersion();

        $mdDialog.show({
            controller: previewController,
            controllerAs: 'self',
            templateUrl: templateUrls.preview,
            parent: $('.fgpa'),
            clickOutsideToClose: true,
    //        clickOutsideToClose: false,
          fullscreen: false,
          skipHide : true,
          multiple: true,
  //        preserveScope:true,
            onRemoving: () => { $timeout(() => {
                document.getElementsByClassName('av-preview-button')[0].focus();
            }, constants.delayWCAG); }
        });
    }
}

/**
 * openPreview controller
 *
 * @function previewController
 * @private
 * @param  {Object} $mdDialog  Angular dialog window object
 */
function previewController($mdDialog) {
    'ngInject';
    const self = this;

    self.close = $mdDialog.hide;
}



//function listcontroller('SimpleArrayCtrl', ['$scope', function SimpleArrayCtrl($scope) {

//   function SimpleArrayCtrl($scope) {

  // Fruits
  //$scope.fruits = ['apple', 'orange', 'pear', 'naartjie'];

  // Selected fruits
//  $scope.selection = ['apple', 'pear'];
  //$scope.selection = [];

  // Toggle selection for a given fruit by name

  function saveLayers (selectedLayers)  {
    self.Layers=undefined;
    self.selection=[];
    console.log('seecltion array is',self.selection);

//      for(var i =0;i < self.selection.length;i++)
//      {

  //      self.selection[i].isChecked = false;
    //  }
  }
    function selectAll (selectedLayers){

      for(let i =0;i < self.Layers.length;i++)
        {
          self.selection.push(self.Layers[i]);
          //self.selection[i].isChecked = true;
        }
    //    $scope.$apply();
        console.log('seecltion array is',self.selection);

    }

    function removeAll (selectedLayers)  {

      self.selection=[];
      console.log('seecltion array is',self.selection);

//      for(var i =0;i < self.selection.length;i++)
  //      {

    //      self.selection[i].isChecked = false;
      //  }
    }
  function toggleSelection(selectedLayers) {
     console.log('in simeplearray ctrl');
  //   let idx = $scope.selection.indexOf(selectedLayers);
     self.idx = self.selection.indexOf(selectedLayers);
     console.log('in simeplearray ctrl,index value', self.idx);
    // console.log('in simeplearray ctrl,selcted layer index value', selectedLayers);
     console.log('in simeplearray selected layer value', selectedLayers);

    // Is currently selected
    if (self.idx > -1) {
      self.selection.splice(self.idx, 1);
    }

    // Is newly selected
    else {
      self.selection.push(selectedLayers);
    }
    console.log('seecltion array is',self.selection);
  //  $scope.$apply();
  }

// new for checklist
 //function toggleSelection(fruitName) {
  //  var idx = $scope.selection.indexOf(fruitName);

    // Is currently selected
//    if (idx > -1) {
//      $scope.selection.splice(idx, 1);
//    }

    // Is newly selected
//    else {
//    }
//  };



//---------------------------------------------------------
function GetCatalogueValue9 ( url,query,xpathsought) {
// return variable  xpathsought
console.log('GET cat 999999999 parameters --'+ url);
//console.log('GET cat 999999999 parameters --'+url+' '+query+' '+xpathsought);
 file.open('POST', url, true);
// file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);

//  file.setRequestHeader('Content-type', 'application/xml');


// tried the following, mar 13 may not work
  file.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
 file.send(query);
 //console.log(' 5 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =

console.log('--- get capability ready state change =', file.readyState);//0 empty,1 loading ,2 done
console.log('--- get capability file status =', file.status);//200okay

   file.onreadystatechange =  (r => { console.log ('get cat 9 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {

      console.log('2--- get capability ready state change =', file.readyState);//0 empty,1 loading ,2or 4 done
      console.log('2--- get capability file status =', file.status);//200okay

     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {

      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 9 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

           let xmlDoc = "";
      //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 9 There was an error processing this image: ' + err)
                 }
            else {


                     console.log(  '9 result is' );

                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('9 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }
            //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '9 evaluating xml,nrreslver is ',nsResolver());


  // let nodes = file.responseXML.evaluate("//*[name()='gmd:CI_OnlineResource']//*[name()='gmd:URL'][1]", file.LresponseXML, nsResolver, XPathResult.ANY_TYPE, null);
//  let nodes = file.responseXML.evaluate("//*[name()='Layer']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);


// works  and combines both queries insame list
 self.nodecount = file.responseXML.evaluate( "count(//*[name()='Layer']/*[name()='Name'])", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
console.log ("------------node before count is =",self.nodecount);
  self.nodecount= self.nodecount.numberValue;

console.log ("------------node  count is =",self.nodecount);
let nodes = file.responseXML.evaluate("//*[name()='Layer']/*[name()='Name'] |  //*[name()='Layer']/*[name()='Abstract']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
  // works  and gets name
  //  let nodes = file.responseXML.evaluate("//*[name()='Layer']/*[name()='Name']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//  let nodes = file.responseXML.evaluate("//*[name()='Layer']/*[name()='Title']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '9 xpath result nodes',nodes);
      console.log("-- the typeof layers is ",typeof nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.Layers = [];
                     let Categ = [];
                     let count = 1;
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '9 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);
if (count > self.nodecount)
  { self.Layers = self.Layers.concat(result2.childNodes[0].nodeValue.concat(count.toString()));
  }
else{
//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
               self.Layers = self.Layers.concat(result2.childNodes[0].nodeValue);
      }      //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
            //   self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
             //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
                 console.log('layercount =',count);

                count = count + 1;
                console.log(' Layers =',self.Layers);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('finished Titles');
                         $scope.$apply();
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )

}



//---------------------------------------------------------
function GetCatalogueValue8 ( url,query,xpathsought) {
// return variable  xpathsought
 //console.log('6 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 //console.log(' 5 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =
   file.onreadystatechange =  (r => { console.log ('5 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {


     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {

      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 8 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

           let xmlDoc = "";
      //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 8 There was an error processing this image: ' + err)
                 }
            else {


                     console.log(  '8 result is' );

                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('8 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }
            //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '8 evaluating xml,nrreslver is ',nsResolver());


let nodes = file.responseXML.evaluate("//*[name()='gmd:CI_OnlineResource']//*[name()='gmd:URL'][1]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '8 xpath result nodes',nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.URL = [];
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '8 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
         if (result2.childNodes[0].nodeValue.search("getcapabilities") !== -1 )
            {
               self.URL = self.URL.concat(result2.childNodes[0].nodeValue);
               console.log(' file url =',self.URL);

             }
             //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
            //   self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
             //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
                console.log(' file url =',self.URL);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )

}


//---------------------------------------------------------
function GetCatalogueValue7 ( url,query,xpathsought) {
// return variable  xpathsought
 //console.log('6 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 //console.log(' 5 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =
   file.onreadystatechange =  (r => { console.log ('5 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {


     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {

      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 7 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

           let xmlDoc = "";
      //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 7 There was an error processing this image: ' + err)
                 }
            else {


                     console.log(  '7 result is' );

                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('7 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }
            //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '7 evaluating xml,nrreslver is ',nsResolver());


let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier']//*[name()='gco:CharacterString'][1]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '6 xpath result nodes',nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.Identifier = '';
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '7 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
               self.Identifier = self.Identifier.concat(result2.childNodes[0].nodeValue);
            //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
            //   self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
             //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
                console.log(' file identifier =',self.Identifier);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )

}

async function GetCatalogueValue6 ( url,query,xpathsought) {
// return variable  xpathsought

return  new Promise((resolve, reject) => {
 //console.log('6 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 //console.log(' 5 just did send in get catalogue');

//await new Promise(resolve => {   file.onreadystatechange =  (r => { console.log ('5 bout to test');
 
   file.onreadystatechange =  (r => { console.log ('5 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {


     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {

      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 6 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

           let xmlDoc = "";
      //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 6 There was an error processing this image: ' + err)
                 }
            else {


                     console.log(  '6 result is' );

                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('6 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }
            //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '6 evaluating xml,nrreslver is ',nsResolver());


let nodes = file.responseXML.evaluate("//*[name()='gmd:MD_BrowseGraphic']//*[name()='gco:CharacterString'][1]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '6 xpath result nodes',nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.Graphic = '';
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '6 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
             
    //     self.Graphic = self.Graphic.concat(result2.childNodes[0].nodeValue);
         self.Graphic = result2.childNodes[0].nodeValue;
         
         //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';

              if (self.Graphic.search("http") !== -1 ) {

           if (self.Graphic.search("img") === -1 )
               self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
             //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
               console.log('1 graphic =',self.Graphic);
               return;

                }
                else { self.Graphic ="";
                 self.Graphic ="https://i5.walmartimages.com/asr/f752abb3-1b49-4f99-b68a-7c4d77b45b40_1.39d6c524f6033c7c58bd073db1b99786.jpeg";
                 self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
                 console.log('graphic 2=',self.Graphic);
                 result2 = nodes.iterateNext();


           //   return;
                    }
                console.log('graphic3=',self.Graphic);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                       $scope.$apply();
                       resolve(self.Graphic);
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )
 // } ) // promise end
   } ).then(() => console.log("RESOLVED getcat 6"))
   .catch(() => console.log("REJECTED getcat 6")); // return promise
}


async function GetCatalogueValue5 ( url,query,xpathsought) {
// return variable  xpathsought
return  new Promise((resolve, reject) => {
  
//return new Promise(function (resolve, reject) {
 console.log('5 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 console.log(' 5 just did send in get catalogue');

// return new Promise(resolve => { file.onreadystatechange =  (r => { console.log ('5 bout to test');
 //return new Promise((resolve,reject) => { file.onreadystatechange =  (r => { console.log ('5 bout to test');
 
   file.onreadystatechange = ( r => { console.log ('5 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 5 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

           let xmlDoc = "";
      //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 5 There was an error processing this image: ' + err)
                 }
            else {


                     console.log(  '5 result is' );

                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('5 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }
            //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '5 evaluating xml,nrreslver is ',nsResolver());


let nodes = file.responseXML.evaluate("//*[name()='gmd:abstract']//*[name()='gco:CharacterString'][1]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '5 xpath result nodes',nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.Abstract = [];
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '5 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
               self.Abstract = self.Abstract.concat(result2.childNodes[0].nodeValue);
           //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
             //4    console.log('cat',Categ);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                       $scope.$apply();
                       resolve(self.Abstract);
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }
     // else 
     // console.log('file  readystate and status', file.readyState , file.status);

    } )
  // } )  // promise end
  } ).then(() => console.log("RESOLVED getcat 5"))
  .catch(() => console.log("REJECTED getcat 5"));
  //.then(() => console.log("RESOLVED")) 
   //} ).then(() => console.log("RESOLVED"))
 //.reject (function() {console.log('error in promise');});
 // .reject(new Error('fail')).then(function() {
   // console.log('error in promise');
  //}, function(error) {
  //  console.log(error); // Stacktrace
  //});
 // .catch(() => console.log("REJECTED"));
  
}





function GetCatalogueValue4 ( url,query,xpathsought) {
// return variable  xpathsought
 console.log('4 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 console.log(' 4 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =
   file.onreadystatechange =  (r => { console.log ('4 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 4 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
 //    let xmlDoc = parser.parseFromString(file.responseText,"text/xml");

 // convert to a dom documnet
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

     //self.searchText = xmlDoc ;
 //  xmlText = xmlText.replace(/\"/g, " ");
         let xmlDoc = "";
 //  let xmlDoc = xmlText;
 //    xmlDoc = file.responseText.replace(/\"/g, " ");
 //    let xmlDoc = xmlText;
     //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 4 There was an error processing this image: ' + err)
                 }
            else {
                   // convert to string !! don't stringify to process or doesn'twork
     //     let  jsonarray = JSON.stringify( result, undefined, 3 );


                     console.log(  '4 result is' );

// let path = "/csw:GetDomainResponse/csw:DomainValues/csw:PropertyName/csw:ListOfValues";
                     //let path = "/csw:GetDomainResponse/csw:DomainValues";
                  //    console.log(' 4 response xml evaluate',file.responseXML.evaluate);
                      console.log('4 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {

                       return  'http://www.opengis.net/cat/csw/2.0.2';
                  //     return  'http://www.w3.org/1999/xlink';
                //       return  'http://www.opengis.net/cat/csw/2.0.2/CSW-discovery.xsd';
                     }// var ns = {
  //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
   //};
  // return ns[prefix] || null;
               // return  'http://www.opengis.net/cat/csw/2.0.2';
    //   resolve ( r => { return  'http://www.opengis.net/cat/csw/2.0.2'} );

                  //                                      }
          //  console.log('nsresolve response =',nsResolver);
               if (file.responseXML.evaluate) {
                     console.log( '4 evaluating xml,nrreslver is ',nsResolver());

//*[local-name()='configuration']/*[local-name()='properties']
//let nodes = file.responseXML.evaluate("/*[local-name()='csw:SearchResults']/*[local-name()='gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*[local-name()='csw:SearchResults']/*[local-name()='gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults']/@numberOfRecordsMatched", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("*[local-name(.)='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works
//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier']//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);


let nodes = file.responseXML.evaluate("//*[name()='gmd:citation']/*[name()='gmd:CI_Citation']/*[name()='gmd:title']/*[name()='gco:CharacterString'][1]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//let nodes = file.responseXML.evaluate("//*[name()='gmd:fileIdentifier'][*[name()='gco:CharacterString']]", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works but gets everything  ------------------------
//let nodes = file.responseXML.evaluate("//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

//*[name()="head"]

//let nodes = file.responseXML.evaluate("/*[local-name()='csw:GetRecordsResponse']/*[local-name()='csw:SearchResults/gmd:fileIdentifier']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
//let nodes = file.responseXML.evaluate("/*:csw:GetRecordsResponse/*:csw:SearchResults/@numberOfRecordsMatched",  file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

              //    let nodes = file.responseXML.evaluate("//gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //  let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse/csw:SearchResults/gmd:MD_MetaData/gmd:fileIdentifier/gco:CharacterString", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
              //    let nodes = file.responseXML.evaluate("//gmd:fileIdentifier", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                  //      let nodes = file.responseXML.evaluate("//csw:SearchStatus", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
      //   let nodes = file.responseXML.evaluate("//csw:GetRecordsResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

      console.log( '4 xpath result nodes',nodes);
  //    console.log( '4 xpath result nodes value',nodes.nodeValue);
//        console.log( '4 xpath inner result',nodes.childNodes[0].nodeValue);
// works
                     self.Titles = [];
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
        //            console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
  // works
                    while (result2) {
                    //     console.log( '4 xpath inner result',result2);
                         console.log( '4 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
               self.Titles = self.Titles.concat(result2.childNodes[0].nodeValue);
           //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
             //4    console.log('cat',Categ);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                       $scope.$apply();
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )

}

function GetCatalogueValue3 ( url,query,xpathsought) {
// return variable  xpathsought
 console.log('3 value parameterd'+url+' '+query+' '+xpathsought);
  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');
 file.send(query);
 console.log(' 3 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =
   file.onreadystatechange =  (r => { console.log ('3 bout to test');
      //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
     if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
      //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
         console.log(' 3 response from geose3rver is');
         console.log(file.responseText);
         let parser = new DOMParser();
 //    let xmlDoc = parser.parseFromString(file.responseText,"text/xml");

 // convert to a dom documnet
       let xmlText = parser.parseFromString(file.responseText,"text/xml");

     //self.searchText = xmlDoc ;
 //  xmlText = xmlText.replace(/\"/g, " ");
         let xmlDoc = "";
 //  let xmlDoc = xmlText;
 //    xmlDoc = file.responseText.replace(/\"/g, " ");
 //    let xmlDoc = xmlText;
     //     let  p = new xjs.Parser();
          let  p = new xjs.Parser({ mergeAttrs: true });

          p.parseString( file.responseText, function( err, result ) {
            if (err) {
                   console.log(' 3 There was an error processing this image: ' + err)
                 }
            else {
                   // convert to string !! don't stringify to process or doesn'twork
     //     let  jsonarray = JSON.stringify( result, undefined, 3 );


                     console.log(  '3 result is' );

// let path = "/csw:GetDomainResponse/csw:DomainValues/csw:PropertyName/csw:ListOfValues";
                     //let path = "/csw:GetDomainResponse/csw:DomainValues";
                      console.log(' 3 response xml evaluate',file.responseXML.evaluate);
                      console.log('3response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                   let xmlDoc = file.responseXML ;

            //       let nsResolver =  function (prefix) {
                     let nsResolver =  function (prefix) {
                      // var ns = {
                      //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
                       //};
                      // return ns[prefix] || null;
                      return  'http://www.opengis.net/cat/csw/2.0.2';
                    }// var ns = {
  //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
   //};
  // return ns[prefix] || null;
               // return  'http://www.opengis.net/cat/csw/2.0.2';
    //   resolve ( r => { return  'http://www.opengis.net/cat/csw/2.0.2'} );

                  //                                      }

               if (file.responseXML.evaluate) {
                     console.log( '3 evaluating xml');
                     let nodes = file.responseXML.evaluate("//csw:Value", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
                     console.log( '3 xpath result nodes',nodes);
                     self.Categories2 = [];
                     let Categ = [];
                    let  result2 = nodes.iterateNext();
                    while (result2) {
                    //     console.log( '3 xpath inner result',result2);
                  //         console.log( '3 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
         //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
               self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
           //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
             //    console.log('cat',Categ);
                       result2 = nodes.iterateNext();
      //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
      // works
                                      }
                                     // console.log('cat',self.Categories2);
                       console.log('cat');
                                        return Categ;
                             }

                          }
                     } //parseString
                  )
      }

    } )

}


 async function GetCatalogueValue2 ( url,query,xpathsought) {
 //function GetCatalogueValue2 ( url,query,xpathsought) {
// return variable  xpathsought
console.log('value parameterd'+url+' '+query+' '+xpathsought);

// sasynch set to false then have a pronel loops and red multilpe times
 file.open('POST', url, true);
 file.setRequestHeader('Content-type', 'application/xml');
file.send(query);
console.log('just did send in get catalogue');

 file.onreadystatechange =   await ( r => {
//  file.onreadystatechange =  ( r => {
  //    if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
    if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
     //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
        console.log(' 2 response from geose3rver is');
        console.log(file.responseText);
        let parser = new DOMParser();
//    let xmlDoc = parser.parseFromString(file.responseText,"text/xml");

// convert to a dom documnet
        let xmlText = parser.parseFromString(file.responseText,"text/xml");

    //self.searchText = xmlDoc ;
//  xmlText = xmlText.replace(/\"/g, " ");
        let xmlDoc = "";
//  let xmlDoc = xmlText;
//    xmlDoc = file.responseText.replace(/\"/g, " ");
//    let xmlDoc = xmlText;
    //     let  p = new xjs.Parser();
         let  p = new xjs.Parser({ mergeAttrs: true });

         p.parseString( file.responseText, function( err, result ) {
           if (err) {
                  console.log(' 2 There was an error processing this image: ' + err)
                }
           else {
                  // convert to string !! don't stringify to process or doesn'twork
    //     let  jsonarray = JSON.stringify( result, undefined, 3 );


      //              console.log(  '2 result is' );

// let path = "/csw:GetDomainResponse/csw:DomainValues/csw:PropertyName/csw:ListOfValues";
                    let path = "/csw:GetDomainResponse/csw:DomainValues";
  //                   console.log(' 2 response xml evaluate',file.responseXML.evaluate);
  //                   console.log('2 response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
                  let xmlDoc = file.responseXML ;

                  let nsResolver =  function (prefix) {
 // var ns = {
 //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
  //};
 // return ns[prefix] || null;
                 return  'http://www.opengis.net/cat/csw/2.0.2';
                                                       }

              if (file.responseXML.evaluate) {
      //              console.log( 'evaluating xml');
                    let nodes = file.responseXML.evaluate("//csw:ListOfValues/csw:Value", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
    //                console.log( '2 xpath result nodes',nodes);


                    let Categ = [];

                         self.Categories2 = [];

                   let  result2 = nodes.iterateNext();
                   while (result2) {
    //                    console.log( '2 xpath inner result',result2);
    //                      console.log( '2 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
        //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);

          //    Categ = Categ.concat(result2.childNodes[0].nodeValue);
              self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);

          //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
            //    console.log('cat',Categ);
                      result2 = nodes.iterateNext();
     //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
     // works
                                     }
                                    // console.log('cat',self.Categories2);
                      console.log('cat',Categ);
                                       return Categ;
                            }

                         }
                    } //parseString
                 )
     }

    } )

}

// test routine

  function GetCatalogueValue ( url,query,xpathsought) {
// return variable  xpathsought
  console.log('value parameterd'+url+' '+query+' '+xpathsought);
   file.open('POST', url, true);
   file.setRequestHeader('Content-type', 'application/xml');
  file.send(query);
  console.log('just did send in get catalogue');

return new Promise((resolve,reject) => { //file.onreadystatechange =
  //  file.onreadystatechange =  (r => {
  //      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
       //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
          console.log(' 2 response from geose3rver is');
          console.log(file.responseText);
          let parser = new DOMParser();
  //    let xmlDoc = parser.parseFromString(file.responseText,"text/xml");

  // convert to a dom documnet
          let xmlText = parser.parseFromString(file.responseText,"text/xml");

      //self.searchText = xmlDoc ;
  //  xmlText = xmlText.replace(/\"/g, " ");
          let xmlDoc = "";
  //  let xmlDoc = xmlText;
  //    xmlDoc = file.responseText.replace(/\"/g, " ");
  //    let xmlDoc = xmlText;
      //     let  p = new xjs.Parser();
           let  p = new xjs.Parser({ mergeAttrs: true });

           p.parseString( file.responseText, function( err, result ) {
             if (err) {
        //            console.log(' 2 There was an error processing this image: ' + err)
                  }
             else {
                    // convert to string !! don't stringify to process or doesn'twork
      //     let  jsonarray = JSON.stringify( result, undefined, 3 );


                      console.log(  '2 result is' );

 // let path = "/csw:GetDomainResponse/csw:DomainValues/csw:PropertyName/csw:ListOfValues";
                      let path = "/csw:GetDomainResponse/csw:DomainValues";
      //                 console.log(' 2 response xml evaluate',file.responseXML.evaluate);
      //                 console.log('2 response xml',file.responseXML);
 //   http://www.opengis.net/cat/csw/2.0.2'
                    let xmlDoc = file.responseXML ;

                    let nsResolver =  function (prefix) {
   // var ns = {
   //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
    //};
   // return ns[prefix] || null;
                // return  'http://www.opengis.net/cat/csw/2.0.2';
        resolve ( r => { return  'http://www.opengis.net/cat/csw/2.0.2'} );

                                                         }

                if (file.responseXML.evaluate) {
          //            console.log( 'evaluating xml');
                      let nodes = file.responseXML.evaluate("//csw:ListOfValues/csw:Value", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
          //            console.log( '2 xpath result nodes',nodes);
                      let Categ = [];
                       self.Categories2 = [];
                     let  result2 = nodes.iterateNext();
                     while (result2) {
            //              console.log( '2 xpath inner result',result2);
          //                  console.log( '2 xpath inner result',result2.childNodes[0].nodeValue);
// works
 //     self.Categories = [].concat(result2.childNodes[0].nodeValue);

 //    self.Categories =Array.from(self.Categories);
          //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);

          self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);

            //    Categ = Categ.concat(result2.childNodes[0].nodeValue);
            //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
              //    console.log('cat',Categ);
                        result2 = nodes.iterateNext();
       //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
       // works
                                       }
                                      // console.log('cat',self.Categories2);
                        console.log('cat',Categ);
                                         return Categ;
                              }

                           }
                      } //parseString
                   )
       }

     } )

}
// let query = '<?xml version="1.0"?>'+
// '<csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">'+
//     '<csw:PropertyName>TopicCategory</csw:PropertyName>'+
//  '</csw:GetDomain>';
// let self.Categories = GetCatalogueValue('https://csw.open.canada.ca/geonetwork/srv/eng/csw',query,xpathsought,"/csw:GetDomainResponse/csw:DomainValues";)


// query to return any element with name like victorai

//file.send('<?xml version="1.0"?>'+
//'<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" resultType="results" outputSchema="csw:IsoRecord">'+
  //  '<csw:Query typeNames="gmd:MD_Metadata">'+
    //  '<csw:ElementName>/gmd:MD_Metadata/gmd:fileIdentifier</csw:ElementName>'+
    //    '<csw:ElementName>/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:title</csw:ElementName>'+
    //    '<csw:Constraint version="1.1.0">'+
    //        '<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">'+
    //            '<PropertyIsLike wildCard="%" singleChar="_" escapeChar="\">'+
    //                '<PropertyName>TopicCategory</PropertyName>'+
    //                '<Literal>Brazil</Literal>'+
    //            '</PropertyIsLike>'+
		//					' </Filter>'+
    //    '</csw:Constraint>'+
  //  '</csw:Query>'+
 // '</csw:GetRecords>');

// get property domain of TopicCaaategeory - works and displays in pull down

// following open works
//file.open('POST', 'https://dev.csw.open.canada.ca/geonetwork/srv/eng/csw', true);

  file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
  file.setRequestHeader('Content-type', 'application/xml');

 file.send('<?xml version="1.0"?>'+
 '<csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">'+
     '<csw:PropertyName>TopicCategory</csw:PropertyName>'+
  '</csw:GetDomain>');

  // get property domain of TopicCaaategeory - works and displays in pull down


//file.send("<?xml version='1.0'?>" +
//' <!DOCTYPE GetCapabilities > ' +
//' <ogc:GetCapabilities service="WMS" version="1.1.1" >' +
//' </ogc:GetCapabilities>');

    file.onreadystatechange = (r => {
//      if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
        if (file.readyState === XMLHttpRequest.DONE && file.status === 200) {
         //useMarkdown(language, self.sections, `${extenStringdir}/images/`, extenString + `-${language}.md`);
            console.log('response from geose3rver is');
            console.log(file.responseText);
            let parser = new DOMParser();
    //    let xmlDoc = parser.parseFromString(file.responseText,"text/xml");

    // convert to a dom documnet
            let xmlText = parser.parseFromString(file.responseText,"text/xml");

        //self.searchText = xmlDoc ;
    //  xmlText = xmlText.replace(/\"/g, " ");
            let xmlDoc = "";
  //  let xmlDoc = xmlText;
    //    xmlDoc = file.responseText.replace(/\"/g, " ");
  //    let xmlDoc = xmlText;
        //     let  p = new xjs.Parser();
             let  p = new xjs.Parser({ mergeAttrs: true });

             p.parseString( file.responseText, function( err, result ) {
               if (err) {
                      console.log('There was an error processing this image: ' + err)
                    }
               else {
                      // convert to string !! don't stringify to process or doesn'twork
        //     let  jsonarray = JSON.stringify( result, undefined, 3 );

            let  jsonarray = result;

          //  console.log ('json array')
            for (let key in jsonarray) {
              if (key.typeof !== 'undefined' ) {
                   console.log(jsonarray[key]);
               console.log(key.toUpperCase() + ':', jsonarray[key]);
             }   }

            for( let i = 0; i < jsonarray.length; i++) {
                  let obj = jsonarray[i];
            }
            // sesarch json for object property name value
        //        let t = findObjectByLabel (jsonarray, 'csw:Capabilities' );

     // works
    //    let t = findObjectByLabel (jsonarray, 'ows:ProviderName' );
      //   let t = findObjectByLabel (jsonarray, 'xlink:href' );
  //  let t = findObjectByLabel (jsonarray, 'gmd:MD_TopicCategoryCode' );
  //    self.searchText = t;

   // workd with getcapavbiibies
  //  self.searchText = findObjectByLabel (jsonarray, 'xlink:href' );

//  console.log(findObjectByLabel (jsonarray, 'gmd:URL' ));

  //self.searchText = findObjectByLabel (jsonarray, 'gmd:URL' );
   console.log(  ' result is' );

  // let path = "/csw:GetDomainResponse/csw:DomainValues/csw:PropertyName/csw:ListOfValues";
  let path = "/csw:GetDomainResponse/csw:DomainValues";
//  let path = "/csw:GetDomainResponse/csw:DomainValues";
//  let path = "/csw:GetDomainResponse/csw:DomainValues";
   console.log('response xml evaluate',file.responseXML.evaluate);
   console.log('response xml',file.responseXML);
//   http://www.opengis.net/cat/csw/2.0.2'
   let xmlDoc = file.responseXML ;
//   let nsResolver = xmlDoc.createNSResolver( xmlDoc.ownerDocument === null ? xmlDoc.documentElement : xmlDoc.ownerDocument.documentElement);

   let nsResolver =  function (prefix) {
    // var ns = {
    //   'i' : 'http://www.opengis.net/cat/csw/2.0.2'
     //};
    // return ns[prefix] || null;
    return  'http://www.opengis.net/cat/csw/2.0.2';
  }

  console.log('ns resolver',nsResolver());

     if (file.responseXML.evaluate) {
              console.log( 'evaluating xml');

  //let  nodes = file.responseXML.evaluate("//*[local-name()='csw:GetDomainResponse']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// works
//  let  nodes = file.responseXML.evaluate("//csw:GetDomainResponse", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// displayd list of values
 //let  nodes = file.responseXML.evaluate("//csw:ListOfValues", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

// tried adding title or category to search but didn't work so get all values and can't skip to a positon in file
  let nodes = file.responseXML.evaluate("//csw:ListOfValues/csw:Value", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
   // nodes = file.responseXML.evaluate("//csw:PropertyName", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
   // nodes = file.responseXML.evaluate("//csw:ListOfValues/csw:Value", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
  console.log( 'xpath result nodes',nodes);

          let  result2 = nodes.iterateNext();
          while (result2) {
            console.log( 'xpath inner result',result2);
            console.log( 'xpath inner result',result2.childNodes[0].nodeValue);
// works
    //     self.Categories = [].concat(result2.childNodes[0].nodeValue);

    //    self.Categories =Array.from(self.Categories);
            self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
          //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
            result2 = nodes.iterateNext();
          //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
          // works
          }
    }

     let query = '<?xml version="1.0"?>'+
     '<csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">'+
         '<csw:PropertyName>Title</csw:PropertyName>'+
      '</csw:GetDomain>';
       query = '<?xml version="1.0"?>'+
      '<csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">'+
//      '<csw:PropertyName>Title</csw:PropertyName>'+
//'<csw:PropertyName>ParentIdentifier</csw:PropertyName>'+
'<csw:PropertyName>Subject</csw:PropertyName>'+
       '</csw:GetDomain>';
    // let self.Categories = GetCatalogueValue('https://csw.open.canada.ca/geonetwork/srv/eng/csw',query,xpathsought,"/csw:GetDomainResponse/csw:DomainValues";)
let xpathtoget = '/csw:GetDomainResponse/csw:DomainValues';
let url = 'https://csw.open.canada.ca/geonetwork/srv/eng/csw';

//

  console.log(' calling getcat');

 // works if no syn open of file doelops therwise
  let tt = GetCatalogueValue2(url,query,xpathtoget);

//  let tt  = GetCatalogueValue(url,query,xpathtoget).then(message => {console.log('tt');});

  setTimeout(function(){ console.log("Help"); }, 3000);

//   self.Categories2 =  self.Categories;
 console.log(' finished calling getcat');
//  console.log(' get cat value is ',  GetCatalogueValue(url,query,xpathtoget) );
//setTimeout ( function(){},5000);
  console.log(' get cat value is ', self.Categories2  );
//-----------------------------------------------------------------
     // findObjectByLabel returns an object not a string
  // self.searchText = findObjectByLabel (jsonarray, 'csw:GetRecordsResponse' );

// below worked

//  let t = findObjectByLabel (jsonarray, 'csw:Value' );
//   console.log(  't result is ',typeof(t ) ,t);
//  console.log(  'window.val result is ',typeof(window.val ) ,window.val);

        // stringify object returned from search
  //    self.searchText =  JSON.stringify( t, undefined, 3 ) ;

//  self.searchText = [].concat(window.val);

//    self.Categories = Array.from(window.val);

  //  self.Categories = [].concat(window.val);

  console.log('value of list=', typeof (self.Categories),self.Categories);

  // following query to retrieve all titles for a text search
  //<?xml version="1.0"?>
  //<csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">
  //    <csw:PropertyName>Title</csw:PropertyName>
  //</csw:GetDomain>

    //   console.log( JSON.stringify( t, undefined, 3 ) );
    //  console.log( JSON.stringify( result, undefined, 3 ) );
 }  } );

          }
       else {
         console.log('no response', file.status);
         }
      });

      /**
            * Cancel save action.
            *
            * @function searchTitles
            * @private
            */
           function searchTitles() {
               // set back the original name for save file name to be not changed
              self.Titles = {};
              console.log(' search titles in changed pull down ListofValues');

              console.log(' sselected subject vakue =',self.selectedSubject);
              console.log(' sselected category value =',self.selectedCategory);

           if (self.selectedSubject !== null)
              { console.log ('subject changed ',self.selectedSubject);

              let  query = ('<?xml version="1.0"?>'+
               '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" maxRecords="9999" resultType="results" outputSchema="csw:IsoRecord">'+
                 '<csw:Query typeNames="gmd:MD_Metadata">'+
                '<csw:ElementSetName>full</csw:ElementSetName>'+
         //      '<csw:ElementName>/gmd:MD_Metadata/gmd:fileIdentifier</csw:ElementName>'+
         //  '<csw:ElementName>/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:title</csw:ElementName>'+
                      '<csw:Constraint version="1.1.0">'+
                          '<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">'+
                              '<PropertyIsLike wildCard="%" singleChar="_" escapeChar="\">'+
            ////                  '<PropertyName>Subject</PropertyName>'+
                //              '<Literal>Boundaries</Literal>'+
                              '<PropertyName>TopicCategory</PropertyName>'+
                              '<Literal>'+ self.selectedCategory + '</Literal>'+
                          '</PropertyIsLike>'+
                            ' </Filter>'+
                      '</csw:Constraint>'+
                 '</csw:Query>'+
                '</csw:GetRecords>');

             //   let xpathtoget = '//csw:Value';

           //  let xpathtoget ='//gmd:title/gco:CharacterString';
             let xpathtoget ='//gmd:CI_Citation/gmd:title/gco:CharacterString';

             //  let xpathtoget = '/csw:GetDomainResponse/csw:DomainValues';
             //let xpathtoget = '/meta';

             //let url ='https://www.gebco.net/data_and_products/gebco_web_services/web_map_service';
             let url = 'https://csw.open.canada.ca/geonetwork/srv/eng/csw';


             let t = GetCatalogueValue4(url,query,xpathtoget);
             // self.Categories =self.Categories2 ;
             t = setTimeout ( function(){console.log(' finished calling getcat 5');
              console.log('result of query - titles', self.Titles);}, 9000);
            // console.log (' v ')
              console.log('result of query - titles', self.Titles);

            }

            else if (self.Category !== null) {
                  console.log('category changed');


            }
            //      uopdate in case change or multi selecteiond

            $scope.$apply();

  }


      /**
            * Cancel save action.
            *
            * @function searchTitles2
            * @private
            */
           function searchTitles2() {
               // set back the original name for save file name to be not changed
              self.Titles = {};
              console.log(' search titles 2222222 ');

              console.log(' sselected 2222222subject vakue =',self.selectedSubject);
              console.log(' sselected 2222 category value =',self.selectedCategory);


          //     console.log ('subject changed ',self.selectedSubject);

              let  query = ('<?xml version="1.0"?>'+
               '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" maxRecords="9999" resultType="results" outputSchema="csw:IsoRecord">'+
                 '<csw:Query typeNames="gmd:MD_Metadata">'+
                '<csw:ElementSetName>full</csw:ElementSetName>'+
         //      '<csw:ElementName>/gmd:MD_Metadata/gmd:fileIdentifier</csw:ElementName>'+
         //  '<csw:ElementName>/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:title</csw:ElementName>'+
                      '<csw:Constraint version="1.1.0">'+
                          '<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">'+
                              '<PropertyIsLike wildCard="%" singleChar="_" escapeChar="\">'+
            ////                  '<PropertyName>Subject</PropertyName>'+
                //              '<Literal>Boundaries</Literal>'+
                              '<PropertyName>Subject</PropertyName>'+
                              '<Literal>'+ self.selectedSubject + '</Literal>'+
                          '</PropertyIsLike>'+
              							' </Filter>'+
                      '</csw:Constraint>'+
                 '</csw:Query>'+
                '</csw:GetRecords>');

             //   let xpathtoget = '//csw:Value';

           //  let xpathtoget ='//gmd:title/gco:CharacterString';
             let xpathtoget ='//gmd:CI_Citation/gmd:title/gco:CharacterString';

             //  let xpathtoget = '/csw:GetDomainResponse/csw:DomainValues';
             //let xpathtoget = '/meta';

             //let url ='https://www.gebco.net/data_and_products/gebco_web_services/web_map_service';
             let url = 'https://csw.open.canada.ca/geonetwork/srv/eng/csw';


             let t = GetCatalogueValue4(url,query,xpathtoget);
             // self.Categories =self.Categories2 ;
             t = setTimeout ( function(){console.log(' finished calling getcat 5');
              console.log('result of query - titles', self.Titles);}, 9000);
            // console.log (' v ')
              console.log('result of query - titles', self.Titles);

//      uopdate in case change or multi selecteiond
              $scope.$apply();


}

/**
      * Cancel save action.
      *
      * @function GetAbstract
      * @private
      */
     async function getAbstract() {
         // set back the original name for save file name to be not changed

        console.log(' in get abstract in changed pull down ListofValues');

        console.log(' sselected subject vakue =',self.selectedSubject);
        console.log(' sselected category value =',self.selectedCategory);

     if (self.selectedSubject !== null)
        { console.log ('title selected ',);

      //  <gmd:abstract xsi:type="gmd:PT_FreeText_PropertyType">
        //           <gco:CharacterString>La base de données présentée ci-dessous correspond au masque agricole 230 m utilisé dans l’application du Programme d’évaluation de l’état des cultures (PEEC) de Statistique Canada. Le masque a été généré à partir des classes 110 à 199 de la classification de l’utilisation du sol de 2015 d’Agriculture Canada. La sélection a ensuite été généralisée à une résolution spatiale de 230 m. Le masque de 2015 a été utilisé pour les saisons de croissance 2015 à //// 2018 inclusivement.</gco:CharacterString>
        //           <gmd:PT_FreeText>
        //             <gmd:textGroup>
        //   <gmd:LocalisedCharacterString locale="#eng">The following dataset correspond to the 230 m agricultural mask from Statistics Canada’s Crop Condition Assessment Program (CCAP). The mask have been generated from the classes 110 to 199 of the 2015 Agriculture and Agri-Food Canada’s landcover classification. The selection was then generalized to a spatial resolution of 230 m. The 2015 mask was used from the 2015 to the 2018 growing seasons inclusively.<///////
        // gmd:LocalisedCharacterString>
          //           </gmd:textGroup>

        let  query = ('<?xml version="1.0"?>'+
         '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" resultType="results" outputSchema="csw:IsoRecord">'+
           '<csw:Query typeNames="gmd:MD_Metadata">'+
          '<csw:ElementSetName>full</csw:ElementSetName>'+
   //      '<csw:ElementName>/gmd:MD_Metadata/gmd:fileIdentifier</csw:ElementName>'+
   //  '<csw:ElementName>/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:title</csw:ElementName>'+
                '<csw:Constraint version="1.1.0">'+
                    '<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">'+
                        '<PropertyIsLike wildCard="%" singleChar="_" escapeChar="\">'+
    //                    '<PropertyName>Identifier</PropertyName>'+
                        '<PropertyName>Title</PropertyName>'+
                        '<Literal>'+ self.selectedTitle +'</Literal>'+
                //            '<Literal>1a337ccf-1943-484a-bd2b-77048736b3ca</Literal>'+
                        '</PropertyIsLike>'+
                      ' </Filter>'+
                '</csw:Constraint>'+
           '</csw:Query>'+
          '</csw:GetRecords>');

       //   let xpathtoget = '//csw:Value';

     //  let xpathtoget ='//gmd:title/gco:CharacterString';
       let xpathtoget ="//*[name()='gmd:abstract']//*[name()='gco:LocalisedCharacterString']";

       //  let xpathtoget = '/csw:GetDomainResponse/csw:DomainValues';
       //let xpathtoget = '/meta';

       //let url ='https://www.gebco.net/data_and_products/gebco_web_services/web_map_service';
       let url = 'https://csw.open.canada.ca/geonetwork/srv/eng/csw';

   // gets abstract
   // ru them in prallel
  // await Promise.all ([GetCatalogueValue5(url,query,xpathtoget),
   // GetCatalogueValue6(url,query,xpathtoget)
  //]).catch(function(err) { 
   //console.log('A promise failed to resolve', err);
//}).then(function(values) { console.log('promises completed');
  //  console.log(values)});
    
 // try {
   // await GetCatalogueValue5(url,query,xpathtoget).catch(function(error) {   console.log('error in promise',error);
 // await GetCatalogueValue5(url,query,xpathtoget).then(GetCatalogueValue6(url,query,xpathtoget)).catch(function(error) {
 //       console.log('error in promise',error);
 // }); }
    // .then(GetCatalogueValue5(url,query,xpathtoget));
  //} 
 // catch (err) {console.log('A promise failed to resolve', err);}
    // do something with error
//}
 let t =   await GetCatalogueValue5(url,query,xpathtoget);
   //await GetCatalogueValue5(url,query,xpathtoget);
 
   // self.Categories =self.Categories2 ;
        xpathtoget ="//*[name()='gmd:MD_BrowseGraphic']//*[name()='gco:LocalisedCharacterString']";

        t = setTimeout ( function(){console.log(' --- finished calling getcat 5');
                                   $scope.$apply(); // update thedisplay to dispay abstract
                                   console.log('result of abstract =', self.Abstract);
                                   }, 1000);
      // console.log (' v ')
      //  console.log('result of query - titles', self.Titles);

      // probem with next line
      // t = setTimeout ( function(){console.log(' finished calling getcat 6');
   
   
      //    $scope.update();  // works
      //let tt =  GetCatalogueValue6(url,query,xpathtoget);

    // get graphic 
   // await GetCatalogueValue6(url,query,xpathtoget);
    
    let tt =   await GetCatalogueValue6(url,query,xpathtoget);
    
     t = setTimeout ( function(){
        // get Identifier

                                  console.log(' finished calling getcat 6');
                                 $scope.$apply(); // update thedisplay to dispay abstract
                                 console.log('result of abstract =', self.Abstract);
                               }, 5000);

      //self.Graphic = '<a href="+ self.Graphic +\">';
  //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
      console.log( 'graphic = ',self.Graphic );
  //       $scope.$apply(); // update thedisplay to dispay abstract
   
  // had prblem with next line
//console.log('result of query - titles', self.Graphic);}, 5000);


          // get Identifier
  //      let ttt = GetCatalogueValue7(url,query,xpathtoget);
//  let ttt = GetCatalogueValue7(url,query,xpathtoget);

  t = setTimeout ( function(){  let ttt = GetCatalogueValue7(url,query,xpathtoget);

                              console.log(' finished calling getcat 7');
                             $scope.$apply(); // update thedisplay to dispay abstract
                             console.log('result of abstract =', self.Abstract);
                           }, 9000);

      // $scope.$apply(); // update thedisplay to dispay abstract
  //     console.log('-- graphic --',self.Graphic);
    //   $scope.$apply(); // update thedisplay to dispay abstract

     //
      }

      else if (self.Category !== null) {
            console.log('category changed',self.Abstract);


      }
}
         //      document.getElementById('avSearchName').value = name;
           //    self.close();

           /**      */
   async function saveUrl() {
                            // set back the original name for save file name to be not changed

      console.log(' in get save');

                  //         console.log(' sselected subject vakue =',self.selectedSubject);
                    //       console.log(' sselected category value =',self.selectedCategory);

                        if (self.selectedSubject !== null)
                           { console.log ('title selected ',);


                           let  query = ('<?xml version="1.0"?>'+
                            '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" resultType="results" outputSchema="csw:IsoRecord">'+
                              '<csw:Query typeNames="gmd:MD_Metadata">'+
                             '<csw:ElementSetName>full</csw:ElementSetName>'+
                      //      '<csw:ElementName>/gmd:MD_Metadata/gmd:fileIdentifier</csw:ElementName>'+
                      //  '<csw:ElementName>/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:title</csw:ElementName>'+
                                   '<csw:Constraint version="1.1.0">'+
                                       '<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">'+
                                           '<PropertyIsLike wildCard="%" singleChar="_" escapeChar="\">'+
                       //                    '<PropertyName>Identifier</PropertyName>'+
                                           '<PropertyName>Title</PropertyName>'+
                                           '<Literal>'+ self.selectedTitle +'</Literal>'+
                                   //            '<Literal>1a337ccf-1943-484a-bd2b-77048736b3ca</Literal>'+
                                           '</PropertyIsLike>'+
                                         ' </Filter>'+
                                   '</csw:Constraint>'+
                              '</csw:Query>'+
                             '</csw:GetRecords>');

                          //   let xpathtoget = '//csw:Value';

                        //  let xpathtoget ='//gmd:title/gco:CharacterString';
                          let xpathtoget ="//*[name()='gmd:abstract']//*[name()='gco:LocalisedCharacterString']";

                          //  let xpathtoget = '/csw:GetDomainResponse/csw:DomainValues';
                          //let xpathtoget = '/meta';

                          //let url ='https://www.gebco.net/data_and_products/gebco_web_services/web_map_service';
                          let url = 'https://csw.open.canada.ca/geonetwork/srv/eng/csw';

                      // gets abstract
                        //  let t = GetCatalogueValue5(url,query,xpathtoget);
                          // self.Categories =self.Categories2 ;
                           xpathtoget ="//*[name()='gmd:MD_BrowseGraphic']//*[name()='gco:LocalisedCharacterString']";

                    let tttttt = await GetCatalogueValue8(url,query,xpathtoget);

                     // get the url
                   console.log('calling gert cat 8');
                  let      t = setTimeout ( function(){  let ttt = GetCatalogueValue8(url,query,xpathtoget);

                                                                          console.log(' finished calling getcat 8');
                                      //                                   $scope.$apply(); // update thedisplay to dispay abstract
                                                                         console.log('result of url =', self.URL);
                                                                       }, 5000);

                       console.log('calling get cat 9');
                       t = setTimeout ( function(){  console.log('calling get cat val 999 with url of -',self.URL[1]);
                                                let ttt = GetCatalogueValue9(self.URL[1],self.URL[1],xpathtoget);
                                                    console.log(' finished calling get URl ');
                                                  $scope.$apply(); // update thedisplay to dispay abstract
                                            console.log('result- getcapability Titles =', self.Layers);
                                          }, 6000);

                         // $scope.$apply(); // update thedisplay to dispay abstract
                       console.log('-- Layers --',self.Layers);

            //           console.log('-- Titles --',self.Titles);
                       //   $scope.$apply(); // update thedisplay to dispay abstract

                       //   $scope.$apply(); // update thedisplay to dispay abstract

                        //
                         }

                         else if (self.Category !== null) {
                                console.log('category changed',self.Abstract);


                         }

                //         initLayer($scope,layers);

        //                 initLayer($scope,$scope.model.layers);
                   }

        /**
         * Save current models to file
         *
         *  @function Search
         * @private
         */
  //      function search() {
//          this.dialog.open(search, {height: '11900px',width: '11900px'
////                                  }
//                          );
    //        try {
                // save the file. Some browsers like IE and Edge doesn't support File constructor, use blob
                // https://stackoverflow.com/questions/39266801/saving-file-on-ie11-with-filesaver
//console.log ("in search....3....................");
          //      const file = new Blob([modelManager.save()], { type: 'application/json' });
          //      FileSaver.saveAs(file, `${self.fileName}.json`);

  //              self.close();
    //        } catch (e) {
      //          self.error = $translate.instant('header.searchdialog.error');
        //        self. = true;
          //      document.getElementsByClassName('av-searchdialog-cancel')[0].focus();
      //      }
    //    }

        /**
         * Cancel save action.
         *
         * @function cancel
         * @private
         */
    //    function cancel() {
            // set back the original name for save file name to be not changed
        //    console.log(self.selectedName);
      //      document.getElementById('avSearchName').value = name;
      //      self.close();


        //}
    }
}
