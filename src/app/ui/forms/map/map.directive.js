
import regeneratorRuntime from "regenerator-runtime"

const templateUrl = require('../form.html');
const templateUrls = {
  preview: require('../preview-dialog2.html'),  // added for preview ???
  search: require('../search-dialog.html')
}



const xjs = require('xml2js');
/**
 * @module avMap
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `avMap` directive for the map form
 *
 */
angular
    .module('app.ui')
    .directive('avMap', avMap);

/**
 * `avMap` directive body.
 *
 * @function avMap
 * @return {object} directive body
 */
function avMap() {
    const directive = {
        restrict: 'E',
        templateUrl,
        scope: { },
        controller: Controller,
        controllerAs: 'self',
        bindToController: true,
        link: (scope, element, attrs) => {
            scope.$on('sf-render-finished', (scope, element) => {
            });
        }
    };

    return directive;
}

/**
 * Map form controller
 *
 * @function Controller
 * @param {Object} $scope module scope
 * @param {Object} $translate Angular translation object
 * @param {Object} $timeout Angular timeout object
 * @param {Object} events Angular events object
 * @param {Object} modelManager service to manage Angular Schema Form model
 * @param {Object} stateManager service to manage model state for validation
 * @param {Object} formService service with common functions for form
 * @param {Object} debounceService service to debounce user input
 * @param {Object} constants service with all application constant
 * @param {Object} layerService service use to get info from ESRI layers
 * @param {Object} commonService service with common functions
 */
function Controller($scope, $translate, $timeout,
    events, modelManager, stateManager, formService, debounceService, constants, layerService, commonService, $mdDialog) {
    'ngInject';
    const self = this;
    self.modelName = 'map';
    self.sectionName = $translate.instant('app.section.map');
    self.formService = formService;

    self.search = search;


    // keep track of legend cursor position
    self.legendCursor = 0;

    // when schema is loaded or create new config is hit, initialize the schema, form and model
    events.$on(events.avSchemaUpdate, () => {
        $scope.model = modelManager.getModel(self.modelName);
        init();
    });

    // when user load a config file, set form and model
    events.$on(events.avLoadModel, () => {
        modelManager.updateModel($scope, self.modelName);
        init();
    });

    // when user change language, reset schema and form
    events.$on(events.avSwitchLanguage, () => {
        self.sectionName = $translate.instant('app.section.map');
        init();
    });

    /**
     * Initialize the map form
     *
     * @function init
     * @private
     */
    function init() {
        // keep track of number of layers to fire onChange only for new layer
        // do the same for other type array. If not the onChange and updateLinkValues are fired continously
        self.layers = -1;
        self.basemaps = -1;
        self.extentSets = -1;
        self.lodSets = -1;
        self.tileSchemas = -1;

        // update schema and form
        $scope.schema = modelManager.getSchema(self.modelName);
        $scope.form = angular.copy($scope.form);
        $scope.form = setForm();

        // set dynamic values drop-down
        self.formService.updateLinkValues($scope, [['extentSets', 'id']], 'extentId');
        self.formService.updateLinkValues($scope, [['lodSets', 'id']], 'lodId');
        self.formService.updateLinkValues($scope, [['baseMaps', 'id'], ['baseMaps', 'name']], 'initBaseId');
        self.formService.updateLinkValues($scope, [['tileSchemas', 'id'], ['tileSchemas', 'name']], 'tileId');
        self.formService.updateLinkValues($scope, [['layers', 'id']], 'initLayerId', 'avLayersIdUpdate');

        $timeout(() => setCollapsibleHeader(), constants.delayCollapseLink);

        // enable/disable setExtent buttons
        $timeout(() => {
            const buttons = [...document.getElementsByClassName('av-extentsets')[0].getElementsByClassName('av-button-square')];

            for (let [index, extentset] of $scope.model.extentSets.entries()) {
                // get buttons onlly for this extent set
                const extentSetBtn = buttons.slice(index * 3, index * 3 + 3);

                // check if projection is supported by setExtent buttons and disable/enable buttons accordingly
                let apply = (constants.supportWkid.findIndex(item => item === extentset.spatialReference.wkid) === -1) ?  'setAttribute' : 'removeAttribute';
                for (let btn of extentSetBtn) {
                    btn[apply]('disabled', '');
                }
            }
        }, constants.delaySplash);

        // set default structure legend values
        setDefaultStructureLegend(constants.delayCollapseLink);
    }

    events.$on(events.avValidateForm, () => {
        $scope.$broadcast('schemaFormValidate');
        stateManager.validateModel(self.modelName, $scope.activeForm, $scope.form[0].tabs, $scope.model);
    });

    events.$on(events.avValidateLegend, () => {
        validateLegend();
    });

    /**
     * Initialize header (collapsible element) value (form element) from model values when it loads.
     *
     * @function setCollapsibleHeader
     * @private
     */
    function setCollapsibleHeader() {
        // set collapsible element from model value when first load
        $timeout(() => {
            // set the class element to get { class, index in the array (-1 to get all) }
            const baseClass = [{ 'cls': 'av-baseMaps', 'ind': -1 }];
            const layerClass = [{ 'cls': 'av-layers', 'ind': -1 }];

            // set basemaps and layers (model, class elements, field to use to update, item to update)
            self.formService.initValueToFormIndex($scope.model.baseMaps, baseClass, 'name', 'legend.0')
            self.formService.initValueToFormIndex($scope.model.layers, layerClass, 'name', 'legend.0')

            // loop trought layers to set children (layer entry and columns for table)
            if (typeof $scope.model.layers !== 'undefined') {
                for (let [layerIndex, layer] of $scope.model.layers.entries()) {

                    // set layer entries
                    if (typeof layer.layerEntries !== 'undefined') {
                        setCollapsibleHeaderEntry(layer.layerType, layerIndex, layer.layerEntries);
                    }

                    // set columns if need be
                    if (typeof layer.table !== 'undefined' && typeof layer.table.columns !== 'undefined') {
                        let columnClass = [
                            { 'cls': 'av-layers', 'ind': layerIndex },
                            { 'cls': 'av-columns', 'ind': -1 }
                        ];
                        self.formService.initValueToFormIndex(layer.table.columns, columnClass, 'title', 'legend.0');
                    }
                }
            }
        }, constants.delayCollapseHeader);
    }

    /**
     * Initialize header (collapsible element) value (form element) for layer entry from model values when it loads.
     *
     * @function setCollapsibleHeaderEntry
     * @private
     * @param  {String} layerType  type of layer
     * @param  {Integer} layerIndex  index of the layer inside the array
     * @param  {Array} entries  array of layer entries
     */
    function setCollapsibleHeaderEntry(layerType, layerIndex, entries) {
        const entryClass = [
            { 'cls': 'av-layers', 'ind': layerIndex },
            { 'cls': 'av-layerEntries', 'ind': -1 }
        ];

        // set entry for esriDynamic and ogcWMS
        if (layerType === 'esriDynamic') {
            self.formService.initValueToFormIndex(entries, entryClass, 'index', 'legend.0');

            // set columns if need be
            for (let [entryIndex, entries] of entries.entries()) {
                if (typeof entries.table !== 'undefined' && typeof entries.table.columns !== 'undefined') {
                    let columnClass = [
                        { 'cls': 'av-layers', 'ind': layerIndex },
                        { 'cls': 'av-layerEntries', 'ind': entryIndex },
                        { 'cls': 'av-columns', 'ind': -1 }
                    ];
                    self.formService.initValueToFormIndex(entries.table.columns, columnClass, 'title', 'legend.0');
                }
            }
        } else if (layerType === 'ogcWms') {
            self.formService.initValueToFormIndex(entries, entryClass, 'id', 'legend.0');
        }
    }

    /**
     * Initialize layer columns for datatable from the layer url and layer entry index
     *
     * @function setColumns
     * @private
     * @param  {Object} event  the event
     * @param  {Integer} item  Angular schema form item
     */
    function setColumns(event, item) {
        // get the element for dynamic and feature layer
        const currTarget  = $(event.currentTarget);
        const elementDyn = currTarget.closest('.av-layer')[0];
        const elementFeat = currTarget.closest('.av-layerEntry')[0];

        // get the index of current layer to get the model and the layerEntry index to get the feature class
        const indexLayer = elementDyn.getAttribute('sf-index');
        const featClass = (item.layerType === 'esriFeature') ?
            -1 : elementFeat.getElementsByClassName('av-feature-index')[0].getElementsByTagName('input')[0].value;

        // get model for specific layer
        let model = $scope.model.layers[indexLayer];

        // send the model to generate the config to query the layer
        layerService.getLayer(model, parseInt(featClass)).then(data => {

            // if it is a dynamic layer, use the index of the layer entry
            model = (item.layerType === 'esriFeature') ? model : model.layerEntries[elementFeat.getAttribute('sf-index')];

            // make sure table exist on layer object
            if (typeof model.table === 'undefined') { model.table = { }; }

            // set the columns from the layer field
            model.table.columns = data.map(field => {
                // get field type, set number as default
                let fieldType = 'number';
                if (field.type === 'esriFieldTypeString') { fieldType = 'string'; }
                else if (field.type === 'esriFieldTypeDate') { fieldType = 'date'; }

                const item = {
                    'data': field.name,
                    'title': field.alias,
                    'visible':  true,
                    'searchable': true,
                    'filter': {
                        'type': fieldType
                    }
                };
                return item;
            });

            // remove shape column if present
            const updateCol = [];
            model.table.columns.map((field, index) => {
                if (field.data.substring(0, 5).toUpperCase() !== 'SHAPE') { updateCol.push(model.table.columns[index]); }
            });
            model.table.columns = updateCol;

            // broadcast event to generate accordion
            events.$broadcast(events.avNewItems);

            // update columns name with field title
            $timeout(() => {
                const columnClass = [{ 'cls': 'av-layers', 'ind': indexLayer }];

                // if dynamic, set layer entry info
                if (item.layerType === 'esriDynamic') {
                    columnClass.push({ 'cls': 'av-layerEntries', 'ind': elementFeat.getAttribute('sf-index') });
                }

                // update columns
                columnClass.push({ 'cls': 'av-columns', 'ind': -1 });
                self.formService.initValueToFormIndex(model.table.columns, columnClass, 'title', 'legend.0');

                // FIXME: remove hidden class. This css is there because we can't use strartempty: true on columns array
                // ASF throws an error. So we start with one undefined element with hidden class then update the array
                // and remove the class
                const element = (featClass === -1) ? elementDyn : elementFeat;
                element.getElementsByClassName('av-columns')[0].classList.remove('hidden');

            }, constants.delayUpdateColumns);
        }).catch(err => {
            // catch the error and reinitialize the fields array
            console.log(err);

            // if it is a dynamic layer, use the index of the layer entry
            model = (item.layerType === 'esriFeature') ? model : model.layerEntries[elementFeat.getAttribute('sf-index')];

            // make sure table exist on layer object then empty fields
            if (typeof model.table === 'undefined') { model.table = { }; }
            model.table.columns = [];
        });
    }

    /**
     * Validate JSON structure legend
     *
     * @function validateLegend
     * @private
     */
    function validateLegend() {
        // remove focus event
        $('#activeForm-legend-root').off('focus');

        const help = document.getElementsByClassName('av-legend-json')[0];
        try {
            if  ($scope.model.legend.type === 'structured') {
                $scope.model.legend.root = JSON.stringify(JSON.parse($scope.model.legend.root), null, 4);
                document.getElementById('activeForm-legend-root').innerHTML = $scope.model.legend.root

                // Validate layers ID
                const idsErrors = validateLayerID($scope.model.legend.root);

                if (idsErrors !== '') {
                    const e = `${$translate.instant('form.map.legenderror')} ${idsErrors}`
                    throw(e);
                }
                // set class and message
                help.classList.remove('av-legend-json-error');
                help.classList.add('av-legend-json-valid');
                help.innerHTML = $translate.instant('form.map.legendtextvalid');
            }
        } catch (e) {
            // set class
            help.classList.add('av-legend-json-error');
            help.classList.remove('av-legend-json-valid');

            // set message
            help.innerHTML = e;

            // Broadcast error if needed
            events.$broadcast(events.avLegendError);
        }
    }

    /**
     * Validate legend's layers ID
     *
     * @function validateLayerID
     * @private
     * @param  {String} json json content
     * @return {String} ids in error
     */
    function validateLayerID(json) {

        // Extract JSON layers IDs
        const ids = [];
        const regexp = /"layerId": "(.*?)"/g;
        json.replace(regexp, (s, match) => ids.push(match));

        // Compare extracted ids with available ids
        let layersList = [];
        for (let item of $scope.model.layers) layersList.push(item.id);

        let noMatches = [];
        for (let id of ids) {
            if (layersList.includes(id) === false) noMatches.push(id);
        }

        let idsErrors = '';
        idsErrors = noMatches.join(', ');

        return idsErrors;
    }

    /**
     * Set default JSON structure legend
     *
     * @function setDefaultStructureLegend
     * @private
     * @param {Interger} time the timeout duration (optional, default = 0)
     */
    function setDefaultStructureLegend(time = 100) {
        // check if structured section needs to be shown
        $timeout(() => {
            const legend = $scope.model.legend;
            const elem = document.getElementsByClassName('av-legend-structure')[0];

            if (legend.legendChoice !== 'structured') {
                elem.classList.add('hidden');
            } else {
                if (typeof legend.root === 'undefined' || legend.root === '') {
                    legend.root = { "name": "root", "children": [] }
                } else if (typeof legend.root === 'object') {
                    legend.root = JSON.stringify(legend.root, null, 4);
                }

                elem.classList.remove('hidden');
            }

            // set legend cursor position
            $('#activeForm-legend-root').on('click', evt => {
                updateCursorPos(evt.currentTarget.selectionStart);
            });
        }, time);
    }

    /**
     * Add a legend section snippet
     *
     * @function addLegendSnippet
     * @private
     * @param  {String} section  type of section to add
     */
    function addLegendSnippet(section) {
        const legendSection = {
            'legendentry': {
                'layerId': '',
                'hidden': 'false',
                'controlledIds': [],
                'entryIndex': 'integer - index of sublayer ESRI dynamic',
                'entryId': 'sublayer id for WMS',
                'coverIcon': '',
                'description': '',
                'symbologyStack': [{
                    'image': '',
                    'text': ''
                }],
                'symbologyRenderStyle': 'icons -- images'
            },
            'legendentrygroup': {
                'name': '',
                'expanded': true,
                'children': [],
                'controls': ['opacity', 'visibility', 'symbology', 'query', 'reload', 'remove', 'settings'],
                'disabledControls': []
            },
            'legendinfo': {
                'infoType': 'title -- image -- text',
                'content': ''
            },
            'legendunbound': {
                'infoType': 'unboundLayer',
                'layerName': '',
                'description': '',
                'symbologyStack': [{
                    'image': '',
                    'text': ''
                }],
                'symbologyRenderStyle': 'icons or images'
            },
            'legendvis': {
                'exclusiveVisibility': ['entry -- entryGroup']
            }
        }

        // update legend string (place the snippet at the last string edit)
        const snippet = JSON.stringify(legendSection[section], null, 4);
        $scope.model.legend.root = [$scope.model.legend.root.slice(0, self.legendCursor),
            snippet,
            $scope.model.legend.root.slice(self.legendCursor)].join('');

        // on focus, highlight the new snippet
        $('#activeForm-legend-root').on('focus', evt => {
            evt.currentTarget.setSelectionRange(self.legendCursor, self.legendCursor + snippet.length + 1);
        });
    }

    /**
     * Show/update legend cursor position
     *
     * @function updateCursorPos
     * @private
     * @param  {Integer} pos  cursor position
     */
    function updateCursorPos(pos) {
        self.legendCursor = pos;
        document.getElementsByClassName('av-legend-cursorpos')[0].innerText =
            `${$translate.instant('form.map.legendcursor')} ${pos}`;
    }

    /**
     * Initialize layer object to solve the bug of 'linked' layers
     * If we don't do this, when we change something in the controls array or state, it
     * is replecated everywhere in all controls or state of all layer.
     * We initilize layerEntries as well. If not new layer have layerEntries from other layers
     *
     * @function initLayer
     * @private
     * @param  {Object} layers  array of layers to initialize
     */
    function initLayer(layers) {
        let flag = false;
        // When we add a new layer, initialize the controls array to avoid linked layers controls bug
        if (self.layers !== -1 && layers.length - 1 > self.layers) {
            const layer = layers[layers.length - 1];

            // reinitialize to break the 'link'
            layer.controls = ['opacity', 'visibility', 'boundingBox', 'query', 'snapshot', 'metadata', 'boundaryZoom', 'refresh', 'reload', 'remove', 'settings', 'data', 'styles'];
            layer.state = {
                'opacity': 1,
                'visibility': true,
                'boundingBox': false,
                'query': true,
                'snapshot': false,
                'hovertips': true
            };
            layer.layerEntries = [];

            // broadcast the new item even to update accordion
            events.$broadcast(events.avNewItems);
            flag = true;
        } else if (self.layers === -1) {
            // special case when it is the first layer
            events.$broadcast(events.avNewItems);
            flag = true;
        }

        // update id array when layer is deleted
        if (self.layers !== -1 && layers.length - 1 < self.layers) {
            self.formService.updateLinkValues($scope, [['layers', 'id']], 'initLayerId', 'avLayersIdUpdate');
        }

        // FIXME: there is bugs with ASF.
        // We are not able to set step value... we need to set them manually
        if (flag) {
            // set opacity input step value
            $timeout(() => {
                $('.av-opacity-input input').each((index, element) => {
                    element.step = 0.05;
                });
            }, constants.debInput);
        }

        // update layers numbers
        self.layers = layers.length - 1;

    }

    /**
     * Initialize layer entry object to solve the bug of 'linked' layers entries
     * If we don't do this, when we change something in the controls array, it
     * is replecated everywhere in all controls or state of all layer entries.
     *
     * @function initLayerEntry
     * @private
     * @param  {Object} layerEntries  array of layer entries to initialize
     */
    function initLayerEntry(layerEntries) {
      console.log('in init layer entry');

        const entry = layerEntries[layerEntries.length -1];
        if (typeof entry !== 'undefined' && typeof entry.init === 'undefined') {
            entry.init = true;
            entry.controls = ['opacity', 'visibility', 'boundingBox', 'query', 'snapshot', 'metadata', 'boundaryZoom', 'refresh', 'reload', 'remove', 'settings', 'data', 'styles'];
            console.log('iadding to init layer entry');

            // we need to reset value of all controls to true to refresh the ui
            // FIXME: know bug, the first time the use will click on a controls, it will have no effect
            const controls = $(document.activeElement).closest('ol').find('.av-controls-bug');
            const inputs = $(controls[controls.length - 1]).find('input');

            for (let input of Array.from(inputs)) {
                input.checked = true;
            }

            // FIXME: there so bugs with ASF.
            // We are not able to set step value... we need to set them manually
            $timeout(() => {
                $('.av-opacity-input input').each((index, element) => {
                    element.step = 0.05;
                });
            }, constants.debInput);

            // broadcast the new item even to update accordion
            events.$broadcast(events.avNewItems);
        }
    }

    function addLayer($scope,layers) {

      console.log('in add layer');

        let flag = false;
        // When we add a new layer, initialize the controls array to avoid linked layers controls bug
    //  $scope.model
    //  if (self.layers !== -1 && layers.length - 1 > self.layers) {
  //    if ($scope.model.layers !== -1 && $scope.model.layers.length - 1 > $scope.model.layers) {
  //const layer = $scope.model.layers[$scope.model.layers.length - 1];

  const layer = $scope.model.layers[$scope.model.layers.length - 1];
  console.log('in add ing layer inforamtion,num layers =', self.layers);

  console.log('in add ing layer inforamtion,layersss =',layers);
  console.log('in add ing layer inforamtion,layer ... =',layer);

            // reinitialize to break the 'link'
            layer.controls = ['opacity', 'visibility', 'boundingBox', 'query', 'snapshot', 'metadata', 'boundaryZoom', 'refresh', 'reload', 'remove', 'settings', 'data', 'styles'];
            layer.state = {
                'opacity': 1,
                'visibility': true,
                'boundingBox': false,
                'query': true,
                'snapshot': false,
                'hovertips': true
          //      'name': 'administrative' ,
        //        'layerChoice':'ogsWms',
        //        'url':'https://cartes.geogratis.gc.ca/wms/canvec_fr'
            };
            layer.name='administrative';
            layer.layerChoice='ogcWms';
            layer.url ='https://cartes.geogratis.gc.ca/wms/canvec_fr';

            layer.layerEntries = [];

            // broadcast the new item even to update accordion
            events.$broadcast(events.avNewItems);
            flag = true;
  ///      } else if (self.layers === -1) {
            // special case when it is the first layer
  //          events.$broadcast(events.avNewItems);
  //          flag = true;
  //      }

        // update id array when layer is deleted
        if (self.layers !== -1 && layers.length - 1 < self.layers) {
            self.formService.updateLinkValues($scope, [['layers', 'id']], 'initLayerId', 'avLayersIdUpdate');
        }

        // FIXME: there is bugs with ASF.
        // We are not able to set step value... we need to set them manually
        if (flag) {
            // set opacity input step value
            $timeout(() => {
                $('.av-opacity-input input').each((index, element) => {
                    element.step = 0.05;
                });
            }, constants.debInput);
        }

        // update layers numbers
        self.layers = layers.length - 1;

    }

// added pw march 20
        function SearchCatalogue($scope,layers,model) {
            // set back the original name for save file name to be not changed
        //    console.log(self.selectedName);
      //      document.getElementById('avSearchName').value = name;
      //      self.close();
      console.log('calling add layer');
            initLayerEntry(model);
              addLayer($scope,layers);
              console.log('after calling add layer');


        }
    /**
     * Set map form
     *
     * @function setForm
     * @private
     * @return {Object} the map form
     */
    function setForm() {
        const scope = $scope;

        return [
            { 'type': 'tabs', 'htmlClass': 'av-inner-tab', 'tabs': [
                { 'title': $translate.instant('form.map.extentlods'), 'items': [
                    { 'type': 'template', 'template': self.formService.addCustomAccordion($translate.instant('form.custom.help'), `help/info-extentlods-${commonService.getLang()}.md`, true) },
                    { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.tileschema'), 'items': [
                        { 'key': 'tileSchemas', 'htmlClass': 'av-accordion-content', 'onChange': tiles => {
                            if (self.tileSchemas !== -1 && tiles.length < self.tileSchemas) {
                                self.formService.updateLinkValues($scope, [['tileSchemas', 'id'], ['tileSchemas', 'name']], 'tileId');
                            }

                            // update tiles schema numbers
                            self.tileSchemas = tiles.length;
                        }, 'notitle': true, 'add': $translate.instant('button.add'), 'items': [
                            { 'type': 'fieldset', 'htmlClass': 'av-tileschema', 'items': [
                                // hidden read only field { 'key': 'tileSchemas[].id', 'readonly': true },
                                { 'key': 'tileSchemas[].name', 'onChange': debounceService.registerDebounce((model, item) => {
                                    self.formService.updateId(model, $scope, 'tileSchemas');
                                    self.formService.updateLinkValues($scope, [['tileSchemas', 'id'], ['tileSchemas', 'name']], 'tileId'); }, constants.debInput, false) },
                                {
                                    'key': 'tileSchemas[].extentSetId',
                                    'type': 'dynamic-select',
                                    'optionData': 'extentId',
                                    'model': 'extentSetId',
                                    'array': true
                                }, {
                                    'key': 'tileSchemas[].lodSetId',
                                    'type': 'dynamic-select',
                                    'optionData': 'lodId',
                                    'model': 'lodSetId',
                                    'array': true
                                }, {
                                    'key': 'tileSchemas[].overviewUrl'
                                }, {
                                    'key': 'tileSchemas[].hasNorthPole',
                                    'htmlClass': 'av-form-advance hidden  av-version-dev  av-version-dev-hide'
                                }
                            ] }
                        ] }
                    ] },
                    { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.extentset'), 'items': [
                        { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': [
                            { 'key': 'extentSets', 'htmlClass': 'av-extentsets', 'onChange': extents => {
                                if (self.extentSets !== -1 && extents.length < self.extentSets) {
                                    self.formService.updateLinkValues(scope, [['extentSets', 'id']], 'extentId')
                                }

                                // update extents numbers
                                self.extentSets = extents.length;
                            }, 'notitle': true, 'add': $translate.instant('button.add'), 'items': [
                                { 'type': 'template', 'template': addButton('extentdefault', 'setExtent', 'av-setdefaultext-button'), 'setExtent': () => self.formService.setExtent('default', $scope.model.extentSets) },
                                { 'type': 'template', 'template': addButton('extentfull', 'setExtent', 'av-setfullext-button'), 'setExtent': () => self.formService.setExtent('full', $scope.model.extentSets) },
                                { 'type': 'template', 'template': addButton('extentmax', 'setExtent', 'av-setmaxext-button'), 'setExtent': () => self.formService.setExtent('maximum', $scope.model.extentSets) },
                                { 'key': 'extentSets[].id', 'htmlClass': 'av-extentset-id', 'onChange': () => debounceService.registerDebounce(self.formService.updateLinkValues(scope, [['extentSets', 'id']], 'extentId'), constants.debInput, false) },
                                { 'type': 'section', 'htmlClass': 'row', 'items': [
                                    { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                        { 'key': 'extentSets[].spatialReference.wkid', 'htmlClass': 'av-extentset-wkid', 'onChange': debounceService.registerDebounce(model => {
                                            const buttons = document.activeElement.closest('.av-extentsets').getElementsByTagName('button');

                                            // check if projection is supported by setExtent buttons and disable/enable buttons accordingly
                                            let apply = (constants.supportWkid.findIndex(item => item === model) === -1) ?  'setAttribute' : 'removeAttribute';
                                            for (let btn of buttons) {
                                                btn[apply]('disabled', '');
                                            }
                                        }, constants.debInput, false) }
                                    ] }
                                    // Not use,
                                    // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                    //     { 'key': 'extentSets[].spatialReference.vcsWkid' }
                                    // ] },
                                    // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                    //     { 'key': 'extentSets[].spatialReference.latestWkid' }
                                    // ] },
                                    // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                    //     { 'key': 'extentSets[].spatialReference.latestVcsWkid' }
                                    // ] },
                                    // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                    //     { 'key': 'extentSets[].spatialReference.wkt' }
                                    // ] }
                                ] },
                                { 'type': 'section', 'htmlClass': 'row', 'items': [
                                    { 'key': 'extentSets[].default', 'items': [
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].default.xmin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].default.ymin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].default.xmax' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].default.ymax' }
                                        ] }
                                    ] }
                                ] },
                                { 'type': 'section', 'htmlClass': 'row', 'items': [
                                    { 'key': 'extentSets[].full', 'items': [
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].full.xmin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].full.ymin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].full.xmax' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].full.ymax' }
                                        ] }
                                    ] }
                                ] },
                                { 'type': 'section', 'htmlClass': 'row', 'items': [
                                    { 'key': 'extentSets[].maximum', 'items': [
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].maximum.xmin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].maximum.ymin' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].maximum.xmax' }
                                        ] },
                                        { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                            { 'key': 'extentSets[].maximum.ymax' }
                                        ] }
                                    ] }
                                ] }
                            ] }
                        ]}
                    ] },
                    { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.lodset'), 'items': [
                        { 'key': 'lodSets', 'htmlClass': 'av-accordion-content', 'onChange': lods => {
                            if (self.lodSets !== -1 && lods.length < self.lodSets) {
                                self.formService.updateLinkValues($scope, [['lodSets', 'id']], 'lodId');
                            }
                            // update lods numbers
                            self.lodSets = lods.length;
                        }, 'notitle': true, 'add': $translate.instant('button.add'), 'items': [
                            { 'key': 'lodSets[]', 'htmlClass': `av-lods-array`, 'items': [
                                { 'key': 'lodSets[].id', 'onChange': () => debounceService.registerDebounce(self.formService.updateLinkValues($scope, [['lodSets', 'id']], 'lodId'), constants.debInput, false) },
                                { 'type': 'template', 'template': addButton('setlods', 'setLods', 'av-setloads-button'), 'setLods': () => self.formService.setLods($scope.model.lodSets, self.formService.getActiveElemIndex('av-lods-array')) },
                                { 'type': 'fieldset', 'htmlClass': 'row', 'items': [
                                    { 'key': 'lodSets[].lods', 'add': null, 'items': [
                                        { 'type': 'section', 'htmlClass': 'row', 'readonly': true, 'items': [
                                            { 'key': 'lodSets[].lods[].level', 'htmlClass': 'col-xs-2 av-check-left' },
                                            { 'key': 'lodSets[].lods[].resolution', 'htmlClass': 'col-xs-3 av-check-left' },
                                            { 'key': 'lodSets[].lods[].scale', 'htmlClass': 'col-xs-2 av-check-left' }
                                        ] }
                                    ] }
                                ] }
                            ] }
                        ] }
                    ] }
                ] },
                { 'title': $translate.instant('form.map.basemaps'), 'items': [
                    { 'type': 'template', 'template': self.formService.addCustomAccordion($translate.instant('form.custom.help'), `help/info-basemaps-${commonService.getLang()}.md`, true) },
                    { 'type': 'fieldset', 'title': $translate.instant('form.map.initialid'), 'items': [
                        {
                            'key': 'initialBasemapId',
                            'type': 'dynamic-select',
                            'optionData': 'initBaseId',
                            'model': 'initialBasemapId',
                            'array': false,
                            'notitle': true
                        }
                    ] },
                    { 'type': 'help', 'helpvalue': '<div class="help-block">' + $translate.instant('form.map.expcoldesc') + '<div>' },
                    { 'key': 'baseMaps', 'htmlClass': 'av-accordion-all av-baseMaps av-sortable', 'startEmpty': true, 'onChange': basemaps => {
                        if (self.basemaps !== -1 && basemaps.length < self.basemaps) {
                            self.formService.updateLinkValues($scope, [['baseMaps', 'id'], ['baseMaps', 'name']], 'initBaseId');
                        } else {
                            // new item, create accordion
                            events.$broadcast(events.avNewItems);
                        }

                        // update basemaps numbers
                        self.basemaps = basemaps.length;
                    }, 'add': $translate.instant('button.add'), 'items': [
                        { 'type': 'help', 'helpvalue': '<div class="av-drag-handle"></div>' },
                        { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-baseMap', 'title': $translate.instant('form.map.basemap'), 'items': [
                            { 'key': 'baseMaps[]', 'htmlClass': 'av-accordion-content', 'notitle': true, 'items': [
                                // hidden read only field { 'key': 'baseMaps[].id', 'readonly': true },
                                { 'key': 'baseMaps[].name', 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.basemap'), 'onChange': debounceService.registerDebounce((model, item) => {
                                    self.formService.copyValueToFormIndex(model, item);
                                    self.formService.updateId(model, $scope, 'baseMaps');
                                    self.formService.updateLinkValues($scope, [['baseMaps', 'id'], ['baseMaps', 'name']], 'initBaseId'); }, constants.debInput, false) },
                                { 'key': 'baseMaps[].description' },
                                { 'key': 'baseMaps[].typeSummary', 'htmlClass': 'av-form-advance hidden' },
                                { 'key': 'baseMaps[].altText' },
                                { 'key': 'baseMaps[].thumbnailUrl', 'htmlClass': 'av-form-advance hidden' },
                                {
                                    'key': 'baseMaps[].tileSchemaId',
                                    'type': 'dynamic-select',
                                    'optionData': 'tileId',
                                    'model': 'tileSchemaId',
                                    'array': true
                                },
                                { 'key': 'baseMaps[].layers', 'add': $translate.instant('button.add'), 'onChange': (model, form) => {
                                    if (model[model.length - 1].id === '') { model[model.length - 1].id = commonService.getUUID();}

                                    // remove with version 2.5
                                    $timeout(() => { events.$broadcast(events.avVersionSet); }, 1000);
                                }, 'items': [
                                    { 'key': 'baseMaps[].layers[].id', 'htmlClass': 'av-form-advance hidden' },
                                    { 'key': 'baseMaps[].layers[].layerType', 'htmlClass': 'av-form-advance hidden' },
                                    { 'key': 'baseMaps[].layers[].url' },
                                    { 'key': 'baseMaps[].layers[].opacity', 'htmlClass': 'av-opacity-input  av-form-advance  hidden  av-version-dev  av-version-dev-hide' }
                                ] },
                                { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.basemapattrib'), 'items': [
                                    { 'key': 'baseMaps[].attribution', 'htmlClass': 'av-accordion-content', 'notitle': true, 'items': [
                                        { 'key': 'baseMaps[].attribution.text' },
                                        // { 'key': 'baseMaps[].attribution.logo' }
                                        // To be brought back with version 2.5 since we want the new element altext (v2.4) to be hide with prod version (2.3)
                                        { 'key': 'baseMaps[].attribution.logo', 'items': [
                                            { 'key': 'baseMaps[].attribution.logo.enabled' },
                                            { 'key': 'baseMaps[].attribution.logo.value' },
                                            { 'key': 'baseMaps[].attribution.logo.altText', 'htmlClass': 'av-form-advance hidden  av-version-dev  av-version-dev-hide' },
                                            { 'key': 'baseMaps[].attribution.logo.link' }
                                        ]}
                                    ] }
                                ] }
                            ] }
                        ] }
                    ] }
                ] },
                { 'title': $translate.instant('form.map.layers'), 'items': [
                    { 'type': 'template', 'template': self.formService.addCustomAccordion($translate.instant('form.custom.help'), `help/info-layers-${commonService.getLang()}.md`, true) },
                    { 'type': 'help', 'helpvalue': '<div class="help-block">' + $translate.instant('form.map.expcoldesc') + '<div>' },
                    { 'type': 'template', 'template': addButton('SearchCatalogue', 'SearchCatalogue'), 'SearchCatalogue': () =>  self.search() },
            //        { 'type': 'template', 'template': addButton('SearchCatalogue', 'SearchCatalogue'), 'SearchCatalogue': () =>  SearchCatalogue($scope,scope.model.layers, scope.model) },
                    { 'key': 'layers', 'htmlClass': 'av-accordion-all av-layers av-sortable', 'startEmpty': true, 'onChange': () => { initLayer(scope.model.layers) }, 'add': $translate.instant('button.add'), 'items': [
                        { 'type': 'help', 'helpvalue': '<div class="av-drag-handle"></div>' },
                        { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-layer', 'title': $translate.instant('form.map.layer'), 'items': [
                            { 'key': 'layers[]', 'htmlClass': `av-accordion-content`, 'notitle': true, 'items': [
                                { 'key': 'layers[].layerChoice', 'type': 'select', 'targetElement': ['layers', 'layerType'], 'targetParent': 'av-accordion-content', 'onChange': (model, item) => self.formService.copyValueToModelIndex(model, item, $scope.model) },
                                // hidden read only field { 'key': 'layers[].id', 'readonly': true },
                                { 'key': 'layers[].name', 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.layer'), 'onChange': debounceService.registerDebounce((model, item) => {
                                    self.formService.copyValueToFormIndex(model, item);
                                    self.formService.updateId(model, $scope, 'layers', true);
                                    self.formService.updateLinkValues($scope, [['layers', 'id']], 'initLayerId', 'avLayersIdUpdate'); }, constants.debInput, false) },
                                { 'key': 'layers[].url', 'onChange': debounceService.registerDebounce(model => {
                                    // check if it is a feature layer. If so, set fields. For dynamic we set when index change
                                    if (!isNaN(parseInt(model.substring(model.lastIndexOf('/') + 1, model.length)))) {
                                        // simulate click event to set fields
                                        const btn = $(document.activeElement).closest('.av-layer').find('.av-form-setfields button')[0];
                                        $timeout(() => { angular.element(btn).triggerHandler('click'); }, 0);
                                    }
                                }, constants.delayUpdateColumns, false) },
                                { 'key': 'layers[].refreshInterval', 'htmlClass': 'av-form-advance hidden' },
                                { 'key': 'layers[].metadataUrl', 'htmlClass': 'av-form-advance hidden' },
                                { 'key': 'layers[].catalogueUrl', 'htmlClass': 'av-form-advance hidden' },
                                // hidden read only field { 'key': 'layers[].layerType', 'readonly': true },
                                { 'key': 'layers[].toggleSymbology', 'htmlClass': 'av-form-advance hidden', 'condition': 'model.layers[arrayIndex].layerChoice === \'esriFeature\' || model.layers[arrayIndex].layerChoice === \'esriDynamic\'' },
                                { 'key': 'layers[].tolerance', 'htmlClass': 'av-form-advance hidden', 'condition': 'model.layers[arrayIndex].layerChoice === \'esriFeature\' || model.layers[arrayIndex].layerChoice === \'esriDynamic\'' },
                                { 'key': 'layers[].imageFormat', 'htmlClass': 'av-form-advance hidden', 'condition': `model.layers[arrayIndex].layerChoice === \'esriDynamic\'` },
                                { 'key': 'layers[].layerEntries', 'htmlClass': 'av-accordion-all av-layerEntries', 'condition': 'model.layers[arrayIndex].layerChoice === \'esriDynamic\'', 'startEmpty': true, 'add': $translate.instant('button.add'), 'onChange': debounceService.registerDebounce(model => { initLayerEntry(model) }, constants.debInput, false), 'items': [
                                    { 'type': 'help', 'helpvalue': '<div class="av-drag-handle"></div>' },
                                    // fields with condition doesn't work inside nested array, it appears only in the first element. We will use condition on group and duplicate them
                                    { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-layerEntry', 'title': $translate.instant('form.map.layerentry'), 'items': [
                                        { 'type': 'fieldset', 'htmlClass': 'av-accordion-content', 'items': [
                                            { 'key': 'layers[].layerEntries[].index', 'htmlClass': 'av-feature-index', 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.layerentry'), 'onChange': debounceService.registerDebounce((model, item) => {
                                                self.formService.copyValueToFormIndex(model, item);

                                                // simulate click event to set fields
                                                const btn = $(document.activeElement).closest('.av-layerEntry').find('.av-form-setfields button')[0];
                                                $timeout(() => { angular.element(btn).triggerHandler('click'); }, 0);
                                            }, constants.delayUpdateColumns, false) },
                                            { 'key': 'layers[].layerEntries[].name' },
                                            { 'key': 'layers[].layerEntries[].outfields', 'htmlClass': 'av-form-advance hidden' },
                                            { 'key': 'layers[].layerEntries[].stateOnly', 'htmlClass': 'av-form-advance hidden' },
                                            { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layerconstrols'), 'items': [
                                                { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': setControlSection('layers[].layerEntries[]', 'av-controls-bug') }
                                            ] },
                                            { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layertable'), 'items': setTableSection('layers[].layerEntries[].table', 'esriDynamic') }
                                        ] }
                                    ] }
                                ] },
                                { 'key': 'layers[].layerEntries', 'htmlClass': 'av-accordion-all av-layerEntries', 'condition': 'model.layers[arrayIndex].layerChoice === \'ogcWms\'', 'startEmpty': true, 'add': $translate.instant('button.add'), 'onChange': debounceService.registerDebounce(model => { initLayerEntry(model) }, constants.debInput, false), 'items': [
                                    { 'type': 'help', 'helpvalue': '<div class="av-drag-handle"></div>' },
                                    // fields with condition doesn't work inside nested array, it appears only in the first element. We will use condition on group and duplicate them
                                    { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-layerEntry', 'title': $translate.instant('form.map.layerentry'), 'items': [
                                        { 'type': 'fieldset', 'htmlClass': 'av-accordion-content', 'items': [
                                            { 'key': 'layers[].layerEntries[].id', 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.layerentry'), 'onChange': debounceService.registerDebounce(self.formService.copyValueToFormIndex, constants.debInput, false) },
                                            { 'key': 'layers[].layerEntries[].name' },
                                            { 'key': 'layers[].layerEntries[].allStyles' },
                                            { 'key': 'layers[].layerEntries[].currentStyle' },
                                            { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layerconstrols'), 'items': [
                                                { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': setControlSection('layers[].layerEntries[]', 'av-controls-bug') }
                                            ] }
                                        ] }
                                    ] }
                                ] },
                                { 'key': 'layers[].singleEntryCollapse', 'condition': 'model.layers[arrayIndex].layerChoice === \'esriDynamic\''  },
                                { 'key': 'layers[].featureInfoMimeType', 'condition': 'model.layers[arrayIndex].layerChoice === \'ogcWms\''  },
                                { 'key': 'layers[].legendMimeType', 'condition': 'model.layers[arrayIndex].layerChoice === \'ogcWms\''  },
                                { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layerconstrols'), 'items': [
                                    { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': setControlSection('layers[]') }
                                ] },
                                { 'type': 'fieldset', 'htmlClass': 'av-form-advance hidden av-accordion-toggle av-collapse', 'condition': 'model.layers[arrayIndex].layerChoice === \'esriFeature\'', 'title': $translate.instant('form.map.layertable'), 'items': setTableSection('layers[].table', 'esriFeature') }
                            ] }
                        ] }
                    ] }
                ] },
                { 'title': $translate.instant('form.map.legend'), 'items': [
                    { 'type': 'template', 'template': self.formService.addCustomAccordion($translate.instant('form.custom.help'), `help/info-legend-${commonService.getLang()}.md`, true) },
                    { 'key': 'legend', 'items': [
                        {
                            'type': 'template',
                            'template': '<div class="av-legend-link" ng-click="form.link()">{{ form.name }}</div>',
                            'name': $translate.instant('form.map.goui'),
                            'link': () => commonService.clickSubTab(2, 'form.ui.general')
                        },
                        {   'key': 'legend.legendChoice',
                            'type': 'select',
                            'titleMap': [
                                { 'value': 'autopopulate', 'name': $translate.instant('form.map.legendauto') },
                                { 'value': 'structured', 'name': $translate.instant('form.map.legendstruct') }
                            ],
                            'copyValueTo': ['legend.type'],
                            'onChange': setDefaultStructureLegend
                        },
                        // hidden read only field { 'key': 'legend.type', 'readonly': true },
                        { 'type': 'fieldset', 'htmlClass': 'av-legend-structure hidden', 'title': $translate.instant('form.map.legendtext'), 'items': [
                            {
                                'key': 'legend.id',
                                'type': 'dynamic-select',
                                'optionData': 'initLayerId',
                                'model': 'legend_id',
                                'array': false,
                                'title': $translate.instant('form.map.legendidstitle'),
                                'description': $translate.instant('form.map.legendidsdesc'),
                                'onChange': (model, item) => {
                                    $scope.model.legend.root = [$scope.model.legend.root.slice(0, self.legendCursor),
                                        model,
                                        $scope.model.legend.root.slice(self.legendCursor)].join('');

                                    // if model is not null (null is because it is fire from this modification $scope.initLayerId = ['null'])
                                    // reinit the optionData to unselect previous selection
                                    if (model !== null) {
                                        const temp = $scope.initLayerId;
                                        $scope.initLayerId = ['null'];
                                        $timeout(() => { $scope.initLayerId = temp }, 500);
                                    }
                                }
                            },
                            { 'key': 'legend.root', 'notitle': true, 'htmlClass': 'av-legend-text', 'type': 'textarea', 'onChange': () => {
                                // remove the focus event
                                const textArea = $('#activeForm-legend-root');
                                textArea.off('focus');

                                // update cursor position
                                updateCursorPos(textArea[0].selectionStart);
                            }},
                            { 'type': 'template', 'template': '<span class="av-legend-cursorpos"></span>' },
                            { 'type': 'help', 'helpvalue': '<div class="av-legend-json"></div>' },
                            { 'type': 'template', 'template': addButton('legendtextvalidate', 'validateLegend'), 'validateLegend': () =>  validateLegend() },
                            { 'type': 'fieldset', 'title': $translate.instant('form.map.legendadd'), 'items': [
                                { 'type': 'section', 'htmlClass': 'av-legend-snippet', 'items': [
                                    { 'type': 'template', 'template': addButton('legendentry', 'addLegend'), 'addLegend': type => addLegendSnippet(type) },
                                    { 'type': 'template', 'template': addButton('legendentrygroup', 'addLegend'), 'addLegend': type => addLegendSnippet(type) },
                                    { 'type': 'template', 'template': addButton('legendinfo', 'addLegend'), 'addLegend': type => addLegendSnippet(type) },
                                    { 'type': 'template', 'template': addButton('legendunbound', 'addLegend'), 'addLegend': type => addLegendSnippet(type) },
                                    { 'type': 'template', 'template': addButton('legendvis', 'addLegend'), 'addLegend': type => addLegendSnippet(type) }
                                ]}
                            ]}
                        ]}
                    ]}
                ] },
                { 'title': $translate.instant('form.map.mapcomp'), 'items': [
                    { 'key': 'components', 'notitle': true, 'items': [
                        { 'key': 'components.mouseInfo', 'items': [
                            { 'key': 'components.mouseInfo.enabled', 'htmlClass': 'accordion-content' },
                            { 'type': 'help', 'helpvalue': '<h5>' + $translate.instant('form.map.spatialref') + '<h5>' },
                            { 'key': 'components.mouseInfo.spatialReference', 'type': 'section', 'htmlClass': 'av-form-advance hidden row', 'items': [
                                { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                    { 'key': 'components.mouseInfo.spatialReference.wkid' }
                                ] }
                                // Not use,
                                // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                //     { 'key': 'components.mouseInfo.spatialReference.vcsWkid' }
                                // ] },
                                // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                //     { 'key': 'components.mouseInfo.spatialReference.latestWkid' }
                                // ] },
                                // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                //     { 'key': 'components.mouseInfo.spatialReference.latestVcsWkid' }
                                // ] },
                                // { 'type': 'section', 'htmlClass': 'col-xs-2', 'items': [
                                //     { 'key': 'components.mouseInfo.spatialReference.wkt' }
                                // ] }
                            ] }
                        ] },
                        { 'key': 'components.northArrow', 'items': [
                            { 'key': 'components.northArrow.enabled' },
                            { 'key': 'components.northArrow.arrowIcon', 'htmlClass': 'av-form-advance hidden' },
                            { 'key': 'components.northArrow.poleIcon', 'htmlClass': 'av-form-advance hidden' }
                        ] },
                        { 'key': 'components.scaleBar' },
                        { 'key': 'components.overviewMap', 'items': [
                            { 'key': 'components.overviewMap.enabled' },
                            { 'key': 'components.overviewMap.expandFactor', 'htmlClass': 'av-form-advance hidden' },
                            { 'key': 'components.overviewMap.initiallyExpanded', 'htmlClass': 'av-form-advance hidden' }
                        ] },
                        { 'type': 'help', 'htmlClass': 'av-form-advance hidden av-version-dev av-version-dev-hide', 'helpvalue': '<div class="help-block">' + $translate.instant('form.map.expcoldesc') + '<div>' },
                        { 'key': 'components.areaOfInterest', 'title': $translate.instant('form.map.areasofinterest'), 'htmlClass': 'av-accordion-all av-form-advance hidden av-version-dev av-version-dev-hide', 'startEmpty': true,'onChange': () => {
                            // new item, create accordion
                            events.$broadcast(events.avNewItems);
                        }, 'add': $translate.instant('button.add'), 'items': [
                            { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle', 'title': $translate.instant('form.map.areaofinterest'), 'items': [
                                { 'key': 'components.areaOfInterest[]', 'htmlClass': `av-accordion-content`, 'notitle': true, 'items': [
                                    { 'key': 'components.areaOfInterest[].title', 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.areaofinterest'), 'onChange': debounceService.registerDebounce((model, item) => {
                                        self.formService.copyValueToFormIndex(model, item);}, constants.debInput, false)
                                    },
                                    { 'type': 'template', 'template': addButton('setareaofinterest', 'setAreaOfInterest', 'av-setareaofinterest-button'), 'setAreaOfInterest': () => self.formService.setAreaOfInterest($scope.model.components.areaOfInterest) },
                                    { 'type': 'section', 'htmlClass': 'row ', 'items': [
                                        { 'key': 'components.areaOfInterest[]', 'notitle': true, 'items': [
                                            { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                                { 'key': 'components.areaOfInterest[].xmin' }
                                            ] },
                                            { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                                { 'key': 'components.areaOfInterest[].ymin' }
                                            ] },
                                            { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                                { 'key': 'components.areaOfInterest[].xmax' }
                                            ] },
                                            { 'type': 'section', 'htmlClass': 'col-xs-3', 'items': [
                                                { 'key': 'components.areaOfInterest[].ymax' }
                                            ] }
                                        ]}
                                    ] },
                                    { 'key': 'components.areaOfInterest[].thumbnailUrl' }
                                ]}
                            ] }
                        ]}
                    ]}
                ] }
            ]}
        ];
    }

    /**
     * Set controls and state section
     *
     * @function setControlSection
     * @private
     * @param {String} key key to use fo the section
     * @param {String} htmlClass HTML class to add - optional
     * @return {Object} the map control and state section
     */
    function setControlSection(key, htmlClass = '') {
        return [{ 'key': `${key}.controls`, 'htmlClass': htmlClass, 'titleMap': {
            'opacity': $translate.instant('form.map.enumopacity'),
            'visibility': $translate.instant('form.map.enumvisibility'),
            'boundingBox': $translate.instant('form.map.enumboundingBox'),
            'query': $translate.instant('form.map.enumquery'),
            'snapshot': $translate.instant('form.map.enumsnapshot'),
            'metadata': $translate.instant('form.map.enummetadata'),
            'boundaryZoom': $translate.instant('form.map.enumboundaryZoom'),
            'refresh': $translate.instant('form.map.enumrefresh'),
            'reload': $translate.instant('form.map.enumreload'),
            'remove': $translate.instant('form.map.enumremove'),
            'settings': $translate.instant('form.map.enumsettings'),
            'data': $translate.instant('form.map.enumdata'),
            'styles': $translate.instant('form.map.enumstyles')
        } },
        // We don't set this section because it is internal to the viewer { 'key': 'layers[].layerEntries[].disabledControls' },
        { 'key': `${key}.state`, 'items': [
            { 'key': `${key}.state.opacity`, 'htmlClass': 'av-opacity-input'  },
            { 'key': `${key}.state.visibility` },
            { 'key': `${key}.state.boundingBox` },
            { 'key': `${key}.state.query` },
            { 'key': `${key}.state.snapshot` },
            { 'key': `${key}.state.hovertips` }
        ] }]
    }

    /**
     * Set the map table section form
     *
     * @function setTableSection
     * @private
     * @param {String} model model value
     * @param {String} layerType type of layer (esriDynamic or esriFeature)
     * @return {Object} the map table section form
     */
    function setTableSection(model, layerType) {
        return [{ 'key': `${model}`, 'notitle': true, 'htmlClass': 'av-accordion-content', 'items': [
            { 'key': `${model}.title` },
            { 'key': `${model}.description` },
            { 'key': `${model}.maximize` },
            { 'key': `${model}.search` },
            { 'key': `${model}.applyMap` },
            { 'type': 'fieldset', 'title': $translate.instant('form.map.layertablecols'), 'items': [
                { 'type': 'button', 'title': $translate.instant('form.map.layertablesetcol'), 'htmlClass': 'av-form-setfields', 'layerType': layerType, 'onClick': setColumns },
                { 'key': `${model}.columns`, 'htmlClass': 'av-accordion-all av-columns hidden', 'add': null, 'items': [
                    { 'type': 'help', 'helpvalue': '<div class="av-drag-handle"></div>' },
                    { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layertablecol'), 'items': [
                        { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': [
                            { 'key': `${model}.columns[].title`, 'targetLink': 'legend.0', 'targetParent': 'av-accordion-toggle', 'default': $translate.instant('form.map.layertablecol'), 'onChange': debounceService.registerDebounce(self.formService.copyValueToFormIndex, constants.debInput, false) },
                            { 'key': `${model}.columns[].description` },
                            { 'key': `${model}.columns[].visible` },
                            { 'key': `${model}.columns[].width` },
                            { 'key': `${model}.columns[].sort` },
                            { 'key': `${model}.columns[].searchable` },
                            { 'type': 'fieldset', 'htmlClass': 'av-accordion-toggle av-collapse', 'title': $translate.instant('form.map.layertablefilter'), 'items': [
                                { 'type': 'section', 'htmlClass': 'av-accordion-content', 'items': [
                                    { 'key': `${model}.columns[].filter`, 'notitle': true, 'items': [
                                        { 'key': `${model}.columns[].filter.type`, 'onChange': () => {
                                            const element = document.activeElement

                                            if (element.type !== 'button') {
                                                element.parentElement.parentElement.children[3].children[1].value = '';
                                            }
                                        } },
                                        { 'key': `${model}.columns[].filter.value`, 'validationMessage': {
                                            'selector': $translate.instant('form.map.selectorerror')
                                        },
                                        '$validators': {
                                            selector: value => {
                                                let flag = true;
                                                const element = document.activeElement

                                                const type = (element.type === 'text') ?
                                                    element.parentElement.parentElement.children[2].children[1].value :
                                                    'not text';

                                                if (type === 'string:selector') {
                                                    try {
                                                        if (value !== '') JSON.parse(value);
                                                    } catch (e) {
                                                        flag = false;
                                                    }
                                                }
                                                return flag
                                            }
                                        } },
                                        { 'key': `${model}.columns[].filter.static` }
                                    ] }
                                ] }
                            ] }
                        ] }
                    ] }
                ] }
            ]}
        ] }]
    }

    /**
     * Add a button for legend section
     *
     * @function addLegendSection
     * @private
     * @param {String} type type of button to add
     * @param {String} func function to associate to ng-click
     * @param {String} addClass class to add
     * @returns {String} the template for the button
     */
    function addButton(type, func, addClass = '') {
        return `<md-button class="av-button-square md-raised ${addClass}"
                        ng-click="form.${func}('${type}')">
                    {{ 'form.map.${type}' | translate }}
                    <md-tooltip>{{ 'form.map.${type}' | translate }}</md-tooltip>
                </md-button>`;
    }

/* added search controller stuff hereh*/
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
    self.error = '';
    self.isError = false;
//      self.searchText ='';
    self.searchSubject ='';
    self.Categories = [];
    self.Categories2 = [];
    self.Subject = [];
    self.Abstract = [];
    self.Graphic = [];
    self.URL = [];
    self.searchTitles = searchTitles;
    self.searchTitles2 = searchTitles2;
    self.getAbstract = getAbstract;
    self.Identifier = '';
    // added or preview ???
        self.openPreview = openPreview;
        self.previewReady = previewReady;
        self.saveUrl = saveUrl;
  //  self.fileName = (name.search('^.*-V[0-9][0-9]$') === 0) ?
//        `${name.slice(0, -2)}${(parseInt(name.slice(-2)) + 1).toString().padStart(2, '0')}` : `${name}-V01`;
    let file = new XMLHttpRequest();
// async open call https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml

// works to query catalogue
//  file.open('POST', 'https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw', true);
//file.setRequestHeader('Content-type', 'application/xml');

//  file.open('POST', 'https://160.106.128.113', true);
//  file.setRequestHeader('Content-type', 'application/xml');

//rcs call to tet rcsdev , not sure all i'd are in, add id at end and returns info
//  file.open('GET',  '//160.106.128.113/v2/doc/en/0', true);
//   file.send();

// file.open('GET',   'https://internal.rcs.gcgeo.gc.ca', true);
//   file.open('GET', 'https://internal.rcs.gcgeo.gc.ca/jstest', true);
//file.send('GET /v2/doc/EN');

//file.send('/v2/doc/en/0');

//  query to get doain values for titles
//    <?xml version="1.0"?>
//    <csw:GetDomain xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2">
//        <csw:PropertyName>Title</csw:PropertyName>
//    </csw:GetDomain>

//

//  file.open('POST', 'https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml', true);
//  file.send('https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml');
//file.send('');

// works with GET
//    file.open('GET', 'https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw?request=GetCapabilities&service=CSW&acceptVersions=2.0.2&acceptFormats=application%252Fxml', true);
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
let nodes = file.responseXML.evaluate("//*[name()='Layer']/*[name()='Name']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);
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
                     console.log( '9 xpath inner result',result2.childNodes[0].nodeValue);
// works
//     self.Categories = [].concat(result2.childNodes[0].nodeValue);

//    self.Categories =Array.from(self.Categories);
     //       self.Categories = self.Categories.concat(result2.childNodes[0].nodeValue);
           self.Titles = self.Titles.concat(result2.childNodes[0].nodeValue);
        //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
        //   self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
         //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
            console.log(' URL =',self.Titles);
                   result2 = nodes.iterateNext();
  //  console.log( 'xpath inner result after iterate',result2.childNodes[0].nodeValue);
  // works
                                  }
                                 // console.log('cat',self.Categories2);
                   console.log('finished Titles');
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

function GetCatalogueValue6 ( url,query,xpathsought) {
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
           self.Graphic = self.Graphic.concat(result2.childNodes[0].nodeValue);
        //   self.Graphic = '<a href=\"'+ self.Graphic +'\">';

          if (self.Graphic.search("http") !== -1 ) {

       if (self.Graphic.search("img") === -1 )
           self.Graphic = '<img src =\"'+ self.Graphic +'\" alt="Graphic"  height="500" width="500">';
         //  self.Categories2 = self.Categories2.concat(result2.childNodes[0].nodeValue);
           console.log('1 graphic =',self.Graphic);
           return;

            }
            else { self.Graphic ="https://i5.walmartimages.com/asr/f752abb3-1b49-4f99-b68a-7c4d77b45b40_1.39d6c524f6033c7c58bd073db1b99786.jpeg";
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
                                    return Categ;
                         }

                      }
                 } //parseString
              )
  }

} )

}


function GetCatalogueValue5 ( url,query,xpathsought) {
// return variable  xpathsought
console.log('5 value parameterd'+url+' '+query+' '+xpathsought);
file.open('POST', 'https://csw.open.canada.ca/geonetwork/srv/eng/csw', true);
file.setRequestHeader('Content-type', 'application/xml');
file.send(query);
console.log(' 5 just did send in get catalogue');

//return new Promise((resolve,reject) => { //file.onreadystatechange =
file.onreadystatechange =  (r => { console.log ('5 bout to test');
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
                                    return Categ;
                         }

                      }
                 } //parseString
              )
  }

} )

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


let nodes = file.responseXML.evaluate("//*[name()='gmd:title']//*[name()='gco:CharacterString']", file.responseXML, nsResolver, XPathResult.ANY_TYPE, null);

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
//file.open('POST', 'https://dev.gcgeo.gc.ca/geonetwork/srv/eng/csw', true);

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
           '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" resultType="results" outputSchema="csw:IsoRecord">'+
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
           '<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" version="2.0.2" resultType="results" outputSchema="csw:IsoRecord">'+
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
 function getAbstract() {
     // set back the original name for save file name to be not changed

    console.log(' in get abstract in changed pull down ListofValues');

    console.log(' sselected subject vakue =',self.selectedSubject);
    console.log(' sselected category value =',self.selectedCategory);

 if (self.selectedSubject !== null)
    { console.log ('title selected ',self.selectedTitle);

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
   let t = GetCatalogueValue5(url,query,xpathtoget);
   // self.Categories =self.Categories2 ;
    xpathtoget ="//*[name()='gmd:MD_BrowseGraphic']//*[name()='gco:LocalisedCharacterString']";

    t = setTimeout ( function(){console.log(' finished calling getcat 5');
                               $scope.$apply(); // update thedisplay to dispay abstract
                               console.log('result of abstract =', self.Abstract);
                               }, 9000);
  // console.log (' v ')
  //  console.log('result of query - titles', self.Titles);

   t = setTimeout ( function(){console.log(' finished calling getcat 6');
//    $scope.update();  // works
//  let tt = GetCatalogueValue6(url,query,xpathtoget);

// get graphic
let tt = GetCatalogueValue6(url,query,xpathtoget);
  t = setTimeout ( function(){
    // get Identifier

                              console.log(' finished calling getcat 7');
                             $scope.$apply(); // update thedisplay to dispay abstract
                             console.log('result of abstract =', self.Abstract);
                           }, 5000);

  //self.Graphic = '<a href="+ self.Graphic +\">';
//   self.Graphic = '<a href=\"'+ self.Graphic +'\">';
  console.log( 'graphic = ',self.Graphic );
//       $scope.$apply(); // update thedisplay to dispay abstract
   console.log('result of query - titles', self.Graphic);}, 5000);

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
                    function saveUrl() {
                        // set back the original name for save file name to be not changed

                       console.log(' in get save');

              //         console.log(' sselected subject vakue =',self.selectedSubject);
                //       console.log(' sselected category value =',self.selectedCategory);

                    if (self.selectedSubject !== null)
                       { console.log ('title selected ',self.selectedTitle);


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
                                //               $scope.$apply(); // update thedisplay to dispay abstract
                                        console.log('result- getcapability Titles =', self.Titles);
                                             }, 9000);

                     // $scope.$apply(); // update thedisplay to dispay abstract
                   console.log('-- URL --',self.URL);

        //           console.log('-- Titles --',self.Titles);
                   //   $scope.$apply(); // update thedisplay to dispay abstract

                   //   $scope.$apply(); // update thedisplay to dispay abstract

                    //
                     }

                     else if (self.Category !== null) {
                           console.log('category changed',self.Abstract);


                     }

            //         initLayer($scope,layers);

                     addLayer($scope,$scope.model.layers);
               }


   }

}
