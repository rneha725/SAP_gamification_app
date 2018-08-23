/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define([
	'jquery.sap.global', 'sap/ui/mdc/library', 'sap/ui/core/Control',
	'sap/ui/model/base/ManagedObjectModel', 'sap/ui/base/ManagedObjectObserver', 'sap/ui/model/BindingMode'
], function(jQuery, library, Control, ManagedObjectModel, ManagedObjectObserver, BindingMode) {
	"use strict";

	var Text;
	var Link;
	var Input;
	var TextArea;
	var DatePicker;
	var DateTimePicker;
	var TimePicker;
	var EditMode = library.EditMode;
	var FieldDisplay = library.FieldDisplay;

	/**
	 * Constructor for a new Field.
	 * A Field can be used to bind its value to data of certain data type. Based on the data type settings, a default
	 * visualization is done by the Field.
	 * The field publishes its properties to the content as a model <code>$field</code> to which the internal content can bind.
	 * This model is local to the content and cannot be used outside the fields context.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 *
	 * @extends sap.ui.core.Control
	 * @implements sap.ui.core.IFormContent
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 *
	 * @constructor
	 * @alias sap.ui.mdc.base.Field
	 * @author SAP SE
	 * @version 1.56.5
	 * @since 1.54.0
	 *
	 * @private
	 * @experimental
	 */
	var Field = Control.extend("sap.ui.mdc.base.Field", /* @lends sap.ui.mdc.base.Field.prototype */ {
		metadata: {
			interfaces: ["sap.ui.core.IFormContent"],
			library: "sap.ui.mdc",
			properties: {
				/**
				 * The value of the field
				 *
				 */
				value: {
					type: "any",
					defaultValue: null
				},
				/**
				 * the additional value of the field.
				 *
				 * Depending on the dataType this could be an description, a unit, a key....
				 */
				additionalValue: {
					type: "any",
					defaultValue: null
				},
				/**
				 * The datatype for the field visualization
				 */
				dataType: {
					type: "string",
					group: "Data",
					defaultValue: 'sap.ui.model.type.String'
				},

				dataTypeConstraints: {
					type: "object",
					group: "Data",
					defaultValue: null
				},

				dataTypeFormatOptions: {
					type: "object",
					group: "Data",
					defaultValue: null
				},

				/**
				 * The width of the field
				 */
				width: {
					type: "sap.ui.core.CSSSize",
					group: "Dimension",
					defaultValue: ""
				},

				/**
				 * Whether the field is editable.
				 */
				editMode: {
					type: "sap.ui.mdc.EditMode",
					group: "Data",
					defaultValue: EditMode.Editable
				},

				/**
				 * Whether the field is required.
				 * TODO: create a type FieldControl (auto, false, true) false might lead to error
				 */
				required: {
					type: "boolean",
					group: "Data",
					defaultValue: false
				},

//				/**
//				 * Icon to be displayed as graphical element before the field.
//				 * This can be an image or an icon from the icon font.
//				 */
//				icon: {
//					type: "sap.ui.core.URI",
//					group: "Appearance",
//					defaultValue: null
//				},

				/**
				 * Defines whether the value and/or description of the field is shown.
				 */
				display: {
					type: "sap.ui.mdc.FieldDisplay",
					defaultValue: FieldDisplay.Value
				},

				/**
				 * Defines the horizontal alignment of the text that is shown inside the input field.
				 */
				textAlign: {
					type: "sap.ui.core.TextAlign",
					group: "Appearance",
					defaultValue: sap.ui.core.TextAlign.Initial
				},

				/**
				 * Defines the text directionality of the input field, e.g. <code>RTL</code>, <code>LTR</code>
				 */
				textDirection: {
					type: "sap.ui.core.TextDirection",
					group: "Appearance",
					defaultValue: sap.ui.core.TextDirection.Inherit
				},

				/**
				 * Defines a short hint intended to aid the user with data entry when the control has no value.
				 * If the value is null no placeholder is shown.
				 */
				placeholder: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},

				/**
				 * Visualizes the validation state of the control, e.g. <code>Error</code>, <code>Warning</code>, <code>Success</code>.
				 */
				valueState: {
					type: "sap.ui.core.ValueState",
					group: "Appearance",
					defaultValue: sap.ui.core.ValueState.None
				},

				/**
				 * Defines the text that appears in the value state message pop-up. If this is not specified, a default text is shown from the resource bundle.
				 */
				valueStateText: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},

				/**
				 * If set, the <code>Field</code> is rendered using a multi line control.
				 *
				 * This property has only effect on type supporting multiple lines
				 */
				multipleLines: {
					type: "boolean",
					group: "Appearance",
					defaultValue: false
				}
			},
			aggregations: {
				/**
				 * optional content to be bound to the value of the field
				 */
				content: {
					type: "sap.ui.core.Control",
					multiple: false
				},

				/**
				 * internal content if no control given
				 */
				_content: {
					type: "sap.ui.core.Control",
					multiple: false,
					visibility: "hidden"
				},

				/**
				 * optional FieldInfo, used for detail information. This is only active in display mode
				 */
				fieldInfo: {
					type: "sap.ui.mdc.base.FieldInfoBase",
					multiple: false
				}
			},
			associations: {
				/**
				 * optional FieldHelp.
				 *
				 * This is an association to allow the usage of one <code>FieldHelp</code> instance on multiple fields
				 */
				fieldHelp: {
					type: "sap.ui.mdc.base.FieldHelpBase",
					multiple: false
				},

				/**
				 * Association to controls / IDs that label this control (see WAI-ARIA attribute aria-labelledby).
				 */
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			},
			events: {
//				/**
//				 * To be used to validate the value CTRL+K checks the values against the constraints.
//				 * This is also fired before a value is put to the data model
//				 */
//				validate: {
//
//				},
				/**
				 * This event is fired when the value property of the field is changed
				 *
				 * <b>Note</b> This event is only triggered if the used content control has a change event
				 */
				change: {
					parameters: {

						/**
						 * The new <code>value</code> of the <code>control</code>.
						 */
						value: { type: "string" },

						/**
						 * Flag indecates if the entered <code>value</code> is valid.
						 */
						valid: { type: "boolean" }
					}
				},
				/**
				 * This event is fired when the value of the field is changed - e.g. at each keypress
				 *
				 * <b>Note</b> This event is only triggered if the used content control has a liveChange event
				 */
				liveChange : {
					parameters : {
						/**
						 * The new value of the input.
						 */
						value : {type : "string"},

						/**
						 * Indicate that ESC key triggered the event.
						 */
						escPressed : {type : "boolean"},

						/**
						 * The value of the input before pressing ESC key.
						 */
						previousValue : {type : "string"}
					}
				},
				/**
				 * Change event if the value is the data changed successfully. If value is not data bound the event is
				 */
				dataChanged: {},
				/**
				 * Fired if the inner control has a press event and this is fired
				 */
				press: {}
			},
			publicMethods: [],
			defaultAggregation: "content",
			defaultProperty: "value"
		},
		_oManagedObjectModel: null
	});

	Field.prototype.init = function() {

		this._oManagedObjectModel = new ManagedObjectModel(this);

		this._oObserver = new ManagedObjectObserver(_observeChanges.bind(this));

		this._oObserver.observe(this, {
			properties: ["value", "additionalValue", "display", "editMode", "dataType", "multipleLines"],
			aggregations: ["fieldInfo" , "content"],
			associations: ["fieldHelp"]
		});

		this._oDatePickerRequested = {};

	};

	Field.prototype.exit = function() {

		this._oManagedObjectModel.destroy();
		delete this._oManagedObjectModel;

		this._oObserver.disconnect();
		this._oObserver = undefined;

	};

	Field.prototype.onBeforeRendering = function() {

		// determine internal control
		_createInternalContent.call(this);

	};

	Field.prototype.onAfterRendering = function() {

// TODO: what if only Input re-renders, but not Field
		if (_getFieldHelp.call(this) && this.getEditMode() != EditMode.Display) {
			// disable browsers autocomplete if field help is available
			var oContent = this.getAggregation("_content");
			if (oContent) {
				var oDomRef = oContent.getFocusDomRef();
				jQuery(oDomRef).attr("autocomplete", "off");
			}
		}

	};

	Field.prototype.onfocusin = function(oEvent) {

		_connectFieldhelp.call(this);

	};

	function _setAdditionalValueFromKey(sKey) {

		if (!this.isBound("additionalValue")) {
			var oFieldHelp = _getFieldHelp.call(this);
			var oContent = this.getAggregation("_content");
			if (oFieldHelp && this.getDisplay() == sap.ui.mdc.FieldDisplay.Description &&
					!oFieldHelp.getFilterValue() && (!oContent || oContent.getDOMValue())) {
				// not during filtering - while typing not needed
				var sAdditionalValue;
				if (sKey) {
					sAdditionalValue = oFieldHelp.getTextForKey(sKey);
					if (this._bConnected) {
						oFieldHelp.setSelectedKey(sKey);
					}
					this.setAdditionalValue(sAdditionalValue);
				}
			}
		}
	}

	Field.formatText = _formatText;

	function _createInternalContent() {

		if (!this._getContent()) {
			var sEditMode = this.getEditMode();
			var sDataType = this.getDataType();
			var oControl;
			var sId = this.getId() + "-inner";

			switch (sEditMode) {
				case EditMode.Display:
					// check if rendered as Link
					var oFieldInfo = this.getFieldInfo();
					if (oFieldInfo) {
// TODO: improve logic
						if (oFieldInfo.isTriggerable()) {
							sDataType = "Link";
						} else if (sDataType == "Link") {
							sDataType = "";
						}
					}

					switch (sDataType) {
						case "Edm.Date":
						case "Edm.DateTimeOffset":
						case "Edm.TimeOfDay":
							oControl = _createTextControl.call(this, sId, {path: "$field>value", type: this._getDataType()}, false);
							break;

						case "Link":
							oControl = _createLinkControl.call(this, sId);
							break;

						default:
							oControl = _createTextControl.call(this, sId, "{$field>/@custom/formattedValue}", this.getMultipleLines());
							break;
					}
					break;

				default:
					switch (sDataType) {
						case "Edm.Date":
							oControl = _createDatePicker.call(this, sId);
							break;

						case "Edm.DateTimeOffset":
							oControl = _createDateTimePicker.call(this, sId);
							break;

						case "Edm.TimeOfDay":
							oControl = _createTimePicker.call(this, sId);
							break;

						default:
							var sPath = "$field>value";
							if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
								sPath = "$field>additionalValue";
							}
							if (this.getMultipleLines() & !_getFieldHelp.call(this)) {
								oControl = _createTextAreaControl.call(this, sId, sPath);
							} else {
								oControl = _createInputControl.call(this, sId, sPath);
							}
							break;
					}
					break;
			}

			if (oControl) {
				this.setAggregation("_content", oControl);
				_setModelOnContent.call(this, oControl);
			}
		}

	}

	function _createTextControl(sId, vText, bWrapping) {

		var oText;

		if (!Text && !this._bTextRequested) {
			Text = sap.ui.require("sap/m/Text");
			if (!Text) {
				sap.ui.require(["sap/m/Text"], _TextLoaded.bind(this));
				this._bTextRequested = true;
			}
		}

		if (Text) {
			oText = new Text(sId, {
				text: vText,
				textAlign: "{$field>textAlign}",
				textDirection: "{$field>textDirection}",
				wrapping: bWrapping,
				width: "100%"
			});
		}

		return oText;

	}

	function _TextLoaded(fnText) {

		Text = fnText;
		this._bTextRequested = false;

		_createInternalContent.call(this);

	}

	function _createLinkControl(sId) {

		var oLink;

		if (!Link && !this._bLinkRequested) {
			Link = sap.ui.require("sap/m/Link");
			if (!Link) {
				sap.ui.require(["sap/m/Link"], _LinkLoaded.bind(this));
				this._bLinkRequested = true;
			}
		}

		if (Link) {
			var sHref = "{$field>additionalValue}";
			var oFieldInfo = this.getFieldInfo();
			if (oFieldInfo) {
				sHref = oFieldInfo.getTriggerHref();
			}
			oLink = new Link(sId, {
				text: "{$field>value}",
				href: sHref,
				textAlign: "{$field>textAlign}",
				textDirection: "{$field>textDirection}",
				width: "100%",
				press: _handleContentPress.bind(this)
			});
		}

		return oLink;

	}

	function _LinkLoaded(fnLink) {

		Link = fnLink;
		this._bLinkRequested = false;

		_createInternalContent.call(this);

	}

	function _createInputControl(sId, sPath) {

		var oInput;

		if (!Input && !this._bInputRequested) {
			Input = sap.ui.require("sap/m/Input");
			if (!Input) {
				sap.ui.require(["sap/m/Input"], _InputLoaded.bind(this));
				this._bInputRequested = true;
			}
		}

		if (Input) {
			oInput = new Input(sId, {
				value: {path: sPath},
				placeholder: "{$field>placeholder}",
				textAlign: "{$field>textAlign}",
				textDirection: "{$field>textDirection}",
				required: "{$field>required}",
				editable: { path: "$field>editMode", formatter: _getEditable },
				enabled: { path: "$field>editMode", formatter: _getEnabled },
				valueState: "{$field>valueState}", // TODO: own ValueState handling?
				valueStateText: "{$field>valueStateText}",
				showValueHelp: !!this.getFieldHelp(),
				width: "100%",
				change: _handleContentChange.bind(this),
				liveChange: _handleContentLiveChange.bind(this),
				valueHelpRequest: _handleValueHelpRequest.bind(this)
			});
		}

		return oInput;

	}

	function _InputLoaded(fnInput) {

		Input = fnInput;
		this._bInputRequested = false;

		_createInternalContent.call(this);

	}

	function _createTextAreaControl(sId, sPath) {

		var oTextArea;

		if (!TextArea && !this._bTextAreaRequested) {
			TextArea = sap.ui.require("sap/m/TextArea");
			if (!TextArea) {
				sap.ui.require(["sap/m/TextArea"], _TextAreaLoaded.bind(this));
				this._bTextAreaRequested = true;
			}
		}

		if (TextArea) {
			oTextArea = new TextArea(sId, {
				value: {path: sPath},
				placeholder: "{$field>placeholder}",
				textAlign: "{$field>textAlign}",
				textDirection: "{$field>textDirection}",
				required: "{$field>required}",
				editable: { path: "$field>editMode", formatter: _getEditable },
				enabled: { path: "$field>editMode", formatter: _getEnabled },
				valueState: "{$field>valueState}", // TODO: own ValueState handling?
				valueStateText: "{$field>valueStateText}",
				width: "100%",
				change: _handleContentChange.bind(this),
				liveChange: _handleContentLiveChange.bind(this)
			});
		}

		return oTextArea;

	}

	function _TextAreaLoaded(fnTextArea) {

		TextArea = fnTextArea;
		this._bTextAreaRequested = false;

		_createInternalContent.call(this);

	}

	function _createDatePickerControl(myDatePicker, sClass, fnCallback, sId) {

		var oDatePicker;

		if (!myDatePicker && !this._oDatePickerRequested[sClass]) {
			myDatePicker = sap.ui.require(sClass);
			if (!myDatePicker) {
				sap.ui.require([sClass], fnCallback.bind(this));
				this._oDatePickerRequested[sClass] = true;
			}
		}

		if (myDatePicker) {
			oDatePicker = new myDatePicker(sId, {
				value: { path: "$field>value", type: this._getDataType() },
				placeholder: "{$field>placeholder}",
				textAlign: "{$field>textAlign}",
				textDirection: "{$field>textDirection}",
				required: "{$field>required}",
				editable: { path: "$field>editMode", formatter: _getEditable },
				enabled: { path: "$field>editMode", formatter: _getEnabled },
				valueState: "{$field>valueState}", // TODO: own ValueState handling?
				valueStateText: "{$field>valueStateText}",
				width: "100%",
				change: _handleContentChange.bind(this)
			});
		}

		return oDatePicker;

	}

	function _createDatePicker(sId) {

		return _createDatePickerControl.call(this, DatePicker, "sap/m/DatePicker", _DatePickerLoaded, sId);

	}

	function _DatePickerLoaded(fnDatePicker) {

		DatePicker = fnDatePicker;
		this._oDatePickerRequested["sap/m/DatePicker"] = false;

		_createInternalContent.call(this);

	}

	function _createDateTimePicker(sId) {

		return _createDatePickerControl.call(this, DateTimePicker, "sap/m/DateTimePicker", _DateTimePickerLoaded, sId);

	}

	function _DateTimePickerLoaded(fnDateTimePicker) {

		DateTimePicker = fnDateTimePicker;
		this._oDatePickerRequested["sap/m/DateTimePicker"] = false;

		_createInternalContent.call(this);

	}

	function _createTimePicker(sId) {

		return _createDatePickerControl.call(this, TimePicker, "sap/m/TimePicker", _TimePickerLoaded, sId);

	}

	function _TimePickerLoaded(fnTimePicker) {

		TimePicker = fnTimePicker;
		this._oDatePickerRequested["sap/m/TimePicker"] = false;

		_createInternalContent.call(this);

	}

	Field.prototype._getContent = function() {

		return this.getContent() || this.getAggregation("_content");

	};

	function _getEditable(sEditMode) {

		if (sEditMode && sEditMode == EditMode.Editable) {
			return true;
		} else {
			return false;
		}

	}

	function _getEnabled(sEditMode) {

		if (sEditMode && sEditMode != EditMode.Disabled) {
			return true;
		} else {
			return false;
		}

	}

	function _observeChanges(oChanges) {

		if (oChanges.name == "value" || oChanges.name == "additionalValue" || oChanges.name == "display") {
			var sFormattedValue = _formatText(this.getValue(), this.getAdditionalValue(), this.getDisplay());
			this._oManagedObjectModel.setProperty("/@custom/formattedValue", sFormattedValue);
		}

		if (oChanges.name == "value" || oChanges.name == "display") {
			_setAdditionalValueFromKey.call(this, this.getValue());
		}

		if (oChanges.name == "editMode") {
			if (oChanges.old != oChanges.current) {
				if (this.getAggregation("_content")) {
					this.destroyAggregation("_content");
					_createInternalContent.call(this); // if no content created right now, do it on rendering
				}
			}
		}

		if (oChanges.name == "multipleLines") {
			if (oChanges.old != oChanges.current) {
				if (this.getAggregation("_content")) {
					this.destroyAggregation("_content");
					_createInternalContent.call(this); // if no content created right now, do it on rendering
				}
			}
		}

		if (oChanges.name == "dataType") {
			if (oChanges.old != oChanges.current) {
				delete this._oDataType;
				if (this.getAggregation("_content")) {
					this.destroyAggregation("_content");
					_createInternalContent.call(this); // if no content created right now, do it on rendering
				}
			}
		}

		if (oChanges.name == "fieldHelp" && oChanges.ids) {
			_fieldHelpChanged.call(this, oChanges.ids, oChanges.mutation);
		}

		if (oChanges.name == "fieldInfo" && oChanges.child) {
			_fieldInfoChanged.call(this, oChanges.child, oChanges.mutation);
		}

		if (oChanges.name == "content" && oChanges.child) {
			_contentChanged.call(this, oChanges.child, oChanges.mutation);
		}

	}

	function _fieldHelpChanged(sId, sMutation) {

		var oFieldHelp = _getFieldHelp.call(this);

		var bFieldHelp = false;
		if (sMutation == "remove") {
// TODO: check if works
			oFieldHelp.detachEvent("select", _handleFieldHelpSelect, this);
			oFieldHelp.detachEvent("navigate", _handleFieldHelpNavigate, this);
			oFieldHelp.detachEvent("dataUpdate", _handleHelpDataUpdate, this);
			oFieldHelp.detachEvent("disconnect", _handleDisconnect, this);
		} else if (sMutation == "insert") {
			if (oFieldHelp) {
//				oFieldHelp.attachEvent("select", _handleFieldHelpSelect, this);
//				oFieldHelp.attachEvent("navigate", _handleFieldHelpNavigate, this);
				oFieldHelp.attachEvent("dataUpdate", _handleHelpDataUpdate, this);
//				oFieldHelp.attachEvent("disconnect", _handleDisconnect, this);
				_setAdditionalValueFromKey.call(this, this.getValue());
			}
			bFieldHelp = true;
		}
		// toggle valueHelp icon on internal Input
		var oContent = this.getAggregation("_content");
		if (oContent && oContent.setShowValueHelp) {
			oContent.setShowValueHelp(bFieldHelp);
		}

	}

	function _fieldInfoChanged(oFieldInfo, sMutation) {

		if (sMutation == "remove") {
			oFieldInfo.detachEvent("dataUpdate", _handleInfoDataUpdate, this);
			if (this.getAggregation("_content")) {
				this.destroyAggregation("_content");
				_createInternalContent.call(this); // Link is not longer needed
			}
		} else if (sMutation == "insert") {
			oFieldInfo.attachEvent("dataUpdate", _handleInfoDataUpdate, this);
			_handleInfoDataUpdate.call(this); // to set already existing values
		}

	}

	function _contentChanged(oContent, sMutation) {

		if (sMutation == "remove") {
			oContent.unbindElement("$field");
			if (oContent.getMetadata().getEvents().change) {
				// oldContent has change event -> detach handler
				oContent.detachEvent("change", _handleContentChange, this);
			}
			if (oContent.getMetadata().getEvents().liveChange) {
				// oldContent has liveChange event -> detach handler
				oContent.detachEvent("liveChange", _handleContentLiveChange, this);
			}
			if (oContent.getMetadata().getEvents().press) {
				// oldContent has press event -> detach handler
				oContent.detachEvent("press", _handleContentPress, this);
			}

			// let the internal control be created on rendering
		} else if (sMutation == "insert") {
			_setModelOnContent.call(this, oContent);
			if (oContent.getMetadata().getEvents().change) {
				// content has change event -> attach handler
				oContent.attachEvent("change", _handleContentChange, this);
			}
			if (oContent.getMetadata().getEvents().liveChange) {
				// content has liveChange event -> attach handler
				oContent.attachEvent("liveChange", _handleContentLiveChange, this);
			}
			if (oContent.getMetadata().getEvents().press) {
				// content has press event -> attach handler
				oContent.attachEvent("press", _handleContentPress, this);
			}

			if (this.getAggregation("_content")) {
				this.destroyAggregation("_content");
			}
		}

	}

	function _formatText(sValue, sAdditionalValue, sDisplay) {
		//format the values in align with UX
		var sFormattedValue = sValue ? sValue : "";//may be changed to -
		var sFormattedAdditionalValue = sAdditionalValue ? sAdditionalValue : "";//may be changed to -

		var sFormattedText = "";

		switch (sDisplay) {
			case FieldDisplay.Description:
				sFormattedText = sFormattedAdditionalValue;
				break;
			case FieldDisplay.ValueDescription:
				sFormattedText = sFormattedValue + " (" + sFormattedAdditionalValue + ")";
				break;
			case FieldDisplay.DescriptionValue:
				sFormattedText = sFormattedAdditionalValue + " (" + sFormattedValue + ")";
				break;
			default: // Value
				sFormattedText = sFormattedValue;
		}

		//remove empty brakets
		if (sFormattedText.replace) {
			sFormattedText = sFormattedText.replace(" ()", "");
		}

		return sFormattedText;

	}

	// function _formatDate(oDate) {

	// 	if (oDate instanceof Date) {
	// 		if (!this._oDateFormat) {
	// 			var fnDateFormat = sap.ui.require("sap/ui/model/type/Date");
	// 			if (fnDateFormat) {
	// 				_createDateFormat.call(this, fnDateFormat);
	// 			} else {
	// 				this._oDate = oDate;
	// 				sap.ui.require(["sap/ui/model/type/Date"], _createDateFormat.bind(this));
	// 			}
	// 		}
	// 		if (this._oDateFormat) {
	// 			return this._oDateFormat.format(oDate);
	// 		} else {
	// 			return oDate;
	// 		}
	// 	} else {
	// 		return oDate;
	// 	}

	// }

	// function _createDateFormat(DateFormat) {
	// 	this._oDateFormat = sap.ui.core.format.DateFormat.getInstance();
	// 	if (this._oDate) {
	// 		// format date async
	// 		var oControl = this.getAggregation("_content");
	// 		oControl.setText(this._oDateFormat.format(this._oDate));
	// 		delete this._oDate;
	// 	}
	// }

	function _setModelOnContent(oContent) {
		oContent.setModel(this._oManagedObjectModel, "$field");
		oContent.bindElement({ path: "/", model: "$field" });
	}

	function _handleContentChange(oEvent) {

		var vValue;
		var bValid = true;

		if ("value" in oEvent.getParameters()) {
			vValue = oEvent.getParameter("value");
		} else {
			vValue = this.getValue();
		}

		if ("valid" in oEvent.getParameters()) {
			bValid = oEvent.getParameter("valid");
		}

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp) {
			oFieldHelp.close();
			oFieldHelp.setFilterValue("");
			if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
				// value is used as key -> use selected item
				vValue = oFieldHelp.getKeyForText(vValue);
				if (this._bConnected) {
					oFieldHelp.setSelectedKey(vValue);
				}
				this.setProperty("value", vValue, true);
			}
		}

		this.fireChange({ value: vValue, valid: bValid });

	}

	function _handleContentLiveChange(oEvent) {

		var vValue;
		var vPreviousValue;
		var bEscPressed = false;

		if ("value" in oEvent.getParameters()) {
			vValue = oEvent.getParameter("value");
		}

		if ("escPressed" in oEvent.getParameters()) {
			bEscPressed = oEvent.getParameter("escPressed");
		}

		if ("previousValue" in oEvent.getParameters()) {
			vPreviousValue = oEvent.getParameter("previousValue");
		} else {
			vPreviousValue = this.getValue();
		}

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp) {
			oFieldHelp.setFilterValue(vValue);
			if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
				// value is used as key -> while suggestion no item is selected
				oFieldHelp.setSelectedKey("");
			}
			if (oFieldHelp.openByTyping()) {
				oFieldHelp.open();
			}
		}

		this.fireLiveChange({ value: vValue, escPressed: bEscPressed, previousValue: vPreviousValue});

	}

	function _handleContentPress(oEvent) {

		var oFieldInfo = this.getFieldInfo();
		if (oFieldInfo && !oEvent.getSource().getHref()) {
			oFieldInfo.open();
		}

		this.firePress();

	}

	Field.prototype.getFocusDomRef = function() {

		var oContent = this._getContent();

		if (oContent) {
			return oContent.getFocusDomRef();
		} else {
			return this.getDomRef();
		}

	};

	Field.prototype.getIdForLabel = function() {

		var sId;
		var oContent = this._getContent();
		if (oContent) {
			sId = oContent.getIdForLabel();
		} else {
			sId = this.getId();
		}

		return sId;

	};

	Field.mapEdmTypes = {
		"Edm.Boolean": "sap.ui.model.odata.type.Boolean",
		"Edm.Byte": "sap.ui.model.odata.type.Byte",
		"Edm.Date": "sap.ui.model.odata.type.Date", // V4 Date
		"Edm.DateTime": "sap.ui.model.odata.type.DateTime", // only for V2  constraints: {displayFormat: 'Date' }
		"Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset", //constraints: { V4: true, precision: n }
		"Edm.Decimal": "sap.ui.model.odata.type.Decimal", //constraints: { precision, scale, minimum, maximum, minimumExclusive, maximumExclusive}
		"Edm.Double": "sap.ui.model.odata.type.Double",
		"Edm.Float": "sap.ui.model.odata.type.Single",
		"Edm.Guid": "sap.ui.model.odata.type.Guid",
		"Edm.Int16": "sap.ui.model.odata.type.Int16",
		"Edm.Int32": "sap.ui.model.odata.type.Int32",
		"Edm.Int64": "sap.ui.model.odata.type.Int64",
		//Edm.Raw not supported
		"Edm.SByte": "sap.ui.model.odata.type.SByte",
		"Edm.Single": "sap.ui.model.odata.type.Single",
		"Edm.String": "sap.ui.model.odata.type.String", //constraints: {maxLength, isDigitSequence}
		"Edm.Time": "sap.ui.model.odata.type.Time", // only V2
		"Edm.TimeOfDay": "sap.ui.model.odata.type.TimeOfDay" // V4 constraints: {precision}
	};

	Field.prototype._createDataType = function(sType) {
		var OTypeClass = jQuery.sap.getObject(sType);
		if (!OTypeClass) {
			var sNewType = Field.mapEdmTypes[sType];
			if (!sNewType) {
				jQuery.sap.log.error("Field", "dataType for " + sType + " can not be created!");
				return null;
			}
			return this._createDataType(sNewType);
		}
		return new OTypeClass(this.getDataTypeFormatOptions(), this.getDataTypeConstraints());
	};

	Field.prototype._getDataType = function(sType) {
		if (!this._oDataType) {
			this._oDataType = this.getProperty("dataType");
			if (typeof this._oDataType === "string") {
				this._oDataType = this._createDataType(this._oDataType);
			}
		}
		return this._oDataType;
	};

	/*
	 * If Field is inside of a Form use Forms aria logic for label
	 */
	Field.prototype.enhanceAccessibilityState = function(oElement, mAriaProps) {

		var oParent = this.getParent();

		if (oParent && oParent.enhanceAccessibilityState) {
			// use Field as control, but aria proprties of rendered inner control.
			oParent.enhanceAccessibilityState(this, mAriaProps);
		}

		return mAriaProps;

	};

	Field.prototype.onsapup = function(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			oEvent.preventDefault();
			oEvent.stopPropagation();
			oFieldHelp.navigate(-1);
		}

	};

	Field.prototype.onsapdown = function(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			oEvent.preventDefault();
			oEvent.stopPropagation();
			oFieldHelp.navigate(1);
		}

	};

	function _handleValueHelpRequest(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			oFieldHelp.setFilterValue("");
			oFieldHelp.toggleOpen();

			if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
				// value is used as key
				oFieldHelp.setSelectedKey(this.getValue());
			}
		}

	}

	function _getFieldHelp() {

		var sId = this.getFieldHelp();
		var oFieldHelp;

		if (sId) {
			oFieldHelp = sap.ui.getCore().byId(sId);
		}

		return oFieldHelp;

	}

	function _handleFieldHelpSelect(oEvent) {

		var sValue = oEvent.getParameter("value");
		var sAdditionalValue = oEvent.getParameter("additionalValue");
		var sKey = oEvent.getParameter("key");
		var sNewValue;
		var sNewAdditionalValue;

		if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
			// value is used as key
			sNewValue = sKey;
			sNewAdditionalValue = sValue;
		} else {
			sNewValue = sValue;
			sNewAdditionalValue = sAdditionalValue;
		}

		this.setProperty("value", sNewValue);
		this.setAdditionalValue(sNewAdditionalValue);
		this.fireChange({value: sNewValue, valid: true});

	}

	function _handleFieldHelpNavigate(oEvent) {

		var sValue = oEvent.getParameter("value");
//		var sAdditionalValue = oEvent.getParameter("additionalValue");
		var sKey = oEvent.getParameter("key");
		var sNewValue;
//		var sNewAdditionalValue;

		if (this.getDisplay() == sap.ui.mdc.FieldDisplay.Description) {
			// value is used as key
			sNewValue = sKey;
//			sNewAdditionalValue = sValue;
		} else {
			sNewValue = sValue;
//			sNewAdditionalValue = sAdditionalValue;
		}
//TODO: API on Input to update value without property????
		var oContent = this.getAggregation("_content");
		if (oContent && oContent.setDOMValue) {
			oContent.setDOMValue(sValue);
			oContent._doSelect();
		}

		this.fireLiveChange({value: sNewValue});

	}

	function _handleHelpDataUpdate(oEvent) {

		if (this.getEditMode() == EditMode.Display) {
			//TODO: only if really needed
			if (this.getAggregation("_content")) {
				this.destroyAggregation("_content");
			}
		} else {
			_setAdditionalValueFromKey.call(this, this.getValue());
		}

	}

	function _handleInfoDataUpdate(oEvent) {

		if (this.getEditMode() == EditMode.Display) {
			var oFieldInfo = this.getFieldInfo();
			var oContent = this.getAggregation("_content");
			if (oFieldInfo && oContent) {
				var bTriggerable = oFieldInfo.isTriggerable();

				if ((bTriggerable && !oContent.setHref) ||
						(!bTriggerable && oContent.setHref)) {
					this.destroyAggregation("_content");
					_createInternalContent.call(this); // Link/Text is needed
				} else if (bTriggerable) {
					var sHref = oFieldInfo.getTriggerHref();
					if (oContent.setHref) {
						oContent.setHref(sHref);
					}
				}
			}
		}

	}

	function _handleDisconnect(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);
		oFieldHelp.detachEvent("select", _handleFieldHelpSelect, this);
		oFieldHelp.detachEvent("navigate", _handleFieldHelpNavigate, this);
		oFieldHelp.detachEvent("disconnect", _handleDisconnect, this);
		this._bConnected = false;

	}

	function _connectFieldhelp() {

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp && !this._bConnected) {
			oFieldHelp.connect(this);
			this._bConnected = true;
			oFieldHelp.attachEvent("select", _handleFieldHelpSelect, this);
			oFieldHelp.attachEvent("navigate", _handleFieldHelpNavigate, this);
			oFieldHelp.attachEvent("disconnect", _handleDisconnect, this);
			oFieldHelp.setSelectedKey(this.getValue());
		}

	}

	return Field;

}, /* bExport= */ true);
