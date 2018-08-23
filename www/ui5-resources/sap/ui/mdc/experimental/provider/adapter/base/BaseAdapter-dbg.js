/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

/**
 * Abstract Model adapter
 * 
 * @experimental
 * @abstract
 */
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/Object"
], function(jQuery, BaseObject) {
	"use strict";

	var BaseAdapter = BaseObject.extend("sap.ui.mdc.experimental.provider.adapter.base.BaseAdapter", {
		/**
		 * The reference to the current meta model.
		 * 
		 * @protected
		 */
		oMetaModel: undefined,
		/**
		 * The models name
		 * 
		 * @protected
		 */
		sModelName: undefined,
		/**
		 * The cached properties
		 * 
		 * @private
		 */
		_mPropertyBag: {},
		_mCustomPropertyBag: {},
		_mProperties: {},
		constructor: function(oModel, sModelName, sContextName) {
			this.oModel = oModel;
			this.oMetaModel = oModel.getMetaModel();
			this.sModelName = sModelName;
			this.sContextName = sContextName;
			this._mPropertyBag = {};
			this._mCustomPropertyBag = {};
			this._mProperties = {};

			this.putProperty("enabled", this.enabled);
			this.putProperty("label", this.label);
			this.putProperty("tooltip", this.tooltip);
			this.putProperty("name", this.name);
			this.putProperty("expand", this.expand);
			this.putProperty("//", this["//"]);
		},

		ready: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method ready must be redefined");
		},

		kind: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method kind must be redefined");
		},

		/**
		 * Switches the metaContext
		 * 
		 * @param {string} sMetaPath the meta context
		 * @param {string} sPath the original path from call
		 * @final
		 */
		switchMetaContext: function(sMetaPath, sPath) {
			this.sPath = sPath;

			// determine the metaPath
			if (!sMetaPath) {
				this.oMetaContext = this.oMetaModel.getMetaContext(sPath);
				this.sMetaPath = this.oMetaContext.getPath();
			} else {
				this.sMetaPath = sMetaPath;
				this.oMetaContext = this.oMetaModel.getObject(this.sMetaPath);
			}

			if (!this._mPropertyBag[this.sMetaPath]) {
				this._mPropertyBag[this.sMetaPath] = {};
				this._mCustomPropertyBag[this.sMetaPath] = {};
			}

			// hook that needs to be implemented
			this.afterMetaContextSwitch();
			var aQualifiers = this.getQualifiers();
			this.putQualifiers(aQualifiers);
		},
		/**
		 * Adaptions after a meta context switch
		 * 
		 * @protected
		 */
		afterMetaContextSwitch: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method afterMetaContextSwitch must be redefined");
		},
		
		/**
		 * Returns the current qualifiers
		 * 
		 * @return {string} aQualifiers The current qualifiers
		 */
		getQualifiers: function() {
			return [];
		},
		/**
		 * The name of the model
		 * 
		 * @returns
		 */
		getModelName: function() {
			return this.sModelName;
		},
		/**
		 * Puts a deferred property to the corresponding adapter
		 */
		putProperty: function(sProperty, fnGetter, oArgs, caller) {
			this._mProperties[sProperty] = {
				fnGetter: fnGetter,
				args: oArgs,
				caller: caller,
				qualifiers: []
			};
			
			this._putProperty(sProperty, fnGetter, oArgs, caller);
		},
		/**
		 * Puts the qualifiers inside the properties
		 */
		putQualifiers: function(aQualifiers) {
			for (var i = 0; i < aQualifiers.length; i++) {
				var sQualifierProperty = aQualifiers[i];

				for ( var sProperty in this._mProperties) {
					var oProperty = this._mProperties[sProperty];

					if (oProperty.qualifiers.indexOf(sQualifierProperty) == -1) {

						var oNewArgs = jQuery.extend([], oProperty.args, [
							sQualifierProperty
						]);

						this._putProperty(sProperty + "#" + sQualifierProperty, oProperty.fnGetter, oNewArgs, oProperty.caller);
						
						oProperty.qualifiers.push(sQualifierProperty);
					}
				}
			}
		},
		
		
		/**
		 * Puts a deferred property to the corresponding adapter
		 */
		_putProperty: function(sProperty, fnGetter, oArgs, caller) {
			if (!caller) {
				caller = this;
			}

			Object.defineProperty(this, sProperty, {
				configurable: true,
				get: function() {
					if (this._mCustomPropertyBag[this.sMetaPath][sProperty]) {
						return this._mCustomPropertyBag[this.sMetaPath][sProperty];
					}
					
					if (!this._mPropertyBag[this.sMetaPath].hasOwnProperty(sProperty)) {
						this._mPropertyBag[this.sMetaPath][sProperty] = fnGetter.apply(caller, oArgs);
					}

					return this._mPropertyBag[this.sMetaPath][sProperty];
				},
				set: function(vValue) {
					this._mCustomPropertyBag[this.sMetaPath][sProperty] = vValue;
				}
			});
		},
		
		/**
		 * The editable meta data information for the property.
		 * 
		 * @return {object} The editable information for the property, this may also be a binding
		 * @public
		 */
		enabled: function() {
			return true;
		},
		/**
		 * The readonly meta data information for the property.
		 * 
		 * @return {object} The readonly information for the property, this may also be a binding
		 * @public
		 */
		disabled: function() {
			return false;
		},
		/**
		 * The label information for the property.
		 * 
		 * @return {string} The label information for the property
		 * @public
		 */
		label: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method getLabel must be redefined");
		},
		/**
		 * The tooltip information for the property.
		 * 
		 * @return {string} The tooltip information for the property
		 * @public
		 */
		tooltip: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method getTooltip must be redefined");
		},
		/**
		 * The prefix for the control Id of the driven control
		 * 
		 * @return {string} The id prefix
		 * @public
		 */
		name: function() {
			throw new Error("sap.ui.mdc.experimental.provider.model.BaseAdapter:  method name must be redefined");
		},
		/**
		 * The binding as a path within the model name
		 */
		asPath: function(sValuePath, sType, sFormatter, sExpand, sFilter) {
			var sPath = "{";

			if (this.sModelName) {
				sPath = sPath + "model: '" + this.sModelName + "',";
			}

			sPath = sPath + "path: '" + sValuePath + "'";

			if (sType) {
				sPath = sPath + ", type: '" + sType + "'";
			}

			if (sFormatter) {
				sPath = sPath + ", formatter: '" + sFormatter + "'";
			}

			if (sExpand) {
				sPath = sPath + ", $expand: '" + sExpand + "'";
			}

			if (sFilter) {
				sPath = sPath + ", $filter: '" + sFilter + "'";
			}

			sPath = sPath + "}";

			return sPath;
		},
		/**
		 * Retreives the context name
		 */
		getContext: function() {
			return this.sContextName;
		},
		/**
		 * Negation of the property
		 */
		not: function(sPropertyName) {
			var sNotPropertyName;

			if (sPropertyName[0] != "!") {
				sNotPropertyName = "!" + sPropertyName;
			} else {
				sNotPropertyName = sPropertyName.substr(1);
			}

			return this[sNotPropertyName];
		},
		/**
		 *
		 */
		setValue: function(sProperty, vValue) {
			this.putProperty(sProperty,this._identity, [vValue], this);
		},
		_identity: function(vValue) {
			return vValue;
		}

	});

	BaseAdapter.Relation = {
		atMostOne: "0..1",
		one: "1",
		many: "n"
	};

	return BaseAdapter;

});
