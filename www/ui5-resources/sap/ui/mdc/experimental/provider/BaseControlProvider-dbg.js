sap.ui.define([
	"jquery.sap.global", "sap/ui/base/Object", "sap/ui/base/ManagedObject", "sap/ui/base/BindingParser", "sap/m/library", "sap/ui/mdc/experimental/provider/adapter/base/FieldAdapter"
], function(jQuery, BaseObject, ManagedObject, BindingParser, mLibrary, FieldAdapter) {
	"use strict";
	var InputType = mLibrary.InputType;

	var BaseControlProvider = BaseObject.extend("sap.ui.mdc.experimental.provider.BaseControlProvider", {
		constructor: function() {
		},
		/**
		 * Sets the provided property information from the metadata interpretation
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sProperty The name of the control property
		 * @param {any} vValue The value of the property that is provided
		 * @public
		 */
		provideAttribute: function(oNode, sAttribute, vValue) {
			if (vValue != null) {
				oNode.setAttribute(sAttribute, vValue);
			}
		},

		/**
		 * Feeds the control from the objects be using the callback function
		 * 
		 * @param {element} oControl The managed object
		 * @param {any} vObject The object that should be provided, this could also be a promise
		 * @param {function} fnCallback - The callback function that expects the control as first an the object as second parameter
		 */
		provideObject: function(oControl, vObject, fnCallback, sAdditionalInfo) {
			if (!vObject) {
				return;
			}

			if (vObject.then) {
				// trigger the promise
				vObject.then(function(vResult) {
					fnCallback(oControl, vResult);
				});
			} else {
				fnCallback(oControl, vObject);
			}
		},

		/**
		 * Sets the provided property information from the meta data interpretation
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sProperty The name of the control property
		 * @param {any} vValue The value of the property that is provided
		 * @public
		 */
		provideProperty: function(oControl, sProperty, vValue, sAdditionalInfo) {
			if (vValue != null) {
				var that = this, oProperty = oControl.getMetadata().getProperty(sProperty);

				if (!oProperty) {
					return;
				}

				if (this.isPropertyAllowedToBeProvided(oControl, sProperty, vValue)) {
					oControl._oProviderData.mProvidedProperties[sProperty] = {
						value: vValue,
						info: sAdditionalInfo
					};

					if (vValue.then) {
						// trigger the promise
						vValue.then(function(vResult) {
							that._provideProperty(oControl, oProperty, vResult, sAdditionalInfo).bind(that);
						});
					} else {
						that._provideProperty(oControl, oProperty, vValue, sAdditionalInfo);
					}
				}
			}
		},

		/**
		 * Sets the provided property information from the metadata interpretation
		 * 
		 * @param {element} oControl The managed object
		 * @param {object} oProperty The control property
		 * @param {any} vValue The value of the property that is provided
		 * @private
		 */
		_provideProperty: function(oControl, oProperty, vValue) {
			var oBinding = BaseControlProvider.getAsBinding(vValue, oControl);
			if (oBinding) {
				oControl.bindProperty(oProperty.name, oBinding);
			} else {
				oProperty.set(oControl, vValue);
			}
		},

		/**
		 * Sets the provided aggegration information from the metadata interpretation
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sAggregation The name of the control aggregation
		 * @param {any} vValue The value of the property that is provided
		 * @param {Control} oTemplate The template
		 * @param {boolean} Whether the aggregation is sharable
		 * @public
		 */
		provideAggregation: function(oControl, sAggregation, vValue, oTemplate, bShareable) {
			if (vValue != null) {
				var that = this, oAggregationInfo = oControl.getMetadata().getAggregation(sAggregation);

				if (!oAggregationInfo) {
					return;
				}

				if (vValue.then) {
					vValue.then(function(vResult) {
						that._provideAggregation(oControl, sAggregation, vResult, oTemplate, bShareable);
					});
				} else {
					that._provideAggregation(oControl, sAggregation, vValue, oTemplate, bShareable);
				}
			}
		},

		/**
		 * Sets the provided aggegration information from the metadata interpretation
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sAggregation The name of the control aggregation
		 * @param {any} vValue The value of the property that is provided
		 * @param {Control} oTemplate The template
		 * @param {boolean} Whether the aggregation is sharable
		 * @private
		 */
		_provideAggregation: function(oControl, sAggregation, vValue, oTemplate, bShareable) {
			var oBinding = BaseControlProvider.getAsBinding(vValue);
			oBinding.template = oTemplate;
			oBinding.templateShareable = bShareable;

			oControl.bindAggregation(sAggregation, oBinding);
		},

		/**
		 * Sets the function that we be runned to prepare the copies from this control as a template
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sFuncName The name of the function that takes the control a input
		 * @param {function} The function that should be runned to prepare clones
		 * @public
		 */
		providePrepareCloneFunction: function(oControl, sFuncName, fnFunction) {
			oControl._oProviderData.mProvidedFunctions[sFuncName] = fnFunction;
			fnFunction(oControl);
		},

		/**
		 * Run all the functions that are meant to be runned after cloning a control
		 * 
		 * @param {element} oControl The managed object
		 * @private
		 */
		prepareClone: function(oClone) {
			var aFunctions = oClone._oProviderData.mProvidedFunctions;

			for ( var i in aFunctions) {
				aFunctions[i](oClone);
			}
		},

		/**
		 * Checks if a certain property has already been provided
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sProperty The name of the control property
		 * @param {any} vValue The value of the property that is provided
		 * @public
		 */
		isPropertyAlreadyProvided: function(oControl, sProperty, vValue) {
			if (oControl._oProviderData.mProvidedProperties[sProperty] && oControl._oProviderData.mProvidedProperties[sProperty] === vValue) {
				return true;
			}

			return false;
		},

		/**
		 * Checks if a property can be provided
		 * 
		 * @param {element} oControl The managed object
		 * @param {string} sProperty The name of the control property
		 * @param {any} vValue The value of the property that is provided
		 * @public
		 */
		isPropertyAllowedToBeProvided: function(oControl, sProperty, vValue) {
			if (oControl.isPropertyInitial(sProperty)) {
				return true;
			}

			if (this.isPropertyAlreadyProvided(oControl, sProperty, vValue) && oControl._oProviderData.mProvidedProperties[sProperty] !== vValue) {
				return true;
			}

			return false;
		},

		/**
		 * Checks if control a certain control can be provided from information of another control
		 * 
		 * @param {element} oControl The control that will be provided from the provider control
		 * @param {element} oProviderControl The control that is used as template to provide the provided control
		 */
		canControlBeProvided: function(oControl, oProviderControl) {
			// still not provided
			if (!oControl) {
				return false;
			}

			if (!oControl._oProviderData) {
				oControl._oProviderData = {
					mProvidedProperties: {},// init provided properties
					mProvidedFunctions: {},// init provided properties
					providedFrom: oProviderControl
				// flag the provider control
				};
				return true;
			} else if (oControl._oProviderData.providedFrom && oControl._oProviderData.providedFrom === oProviderControl) {
				return true;
			}

			return false;
		},

		/**
		 * Returns the name of the class
		 * 
		 * @return {string} The name of the provider
		 */
		getName: function() {
			return Object.getPrototypeOf(this)._sName;
		},

		/**
		 * Function to shape the control from meta data.
		 * 
		 * @param {element} The control
		 * @param {object} The adapter
		 */
		driveWithMetadata: function(oControl, oAdapter) {
			throw new Error("sap.ui.mdc.experimental.provider.BaseControlProvider: method driveWithMetadata must be redefined");
		},
		/**
		 * Function to preprocess the control with metadata
		 * 
		 * @param {element} The the control node
		 * @param {oCtx} the Context callback
		 * @param {object} The adapter
		 */
		renderWithMetadata: function(oNode, oContextCallback, oAdapter) {
			throw new Error("sap.ui.mdc.experimental.provider.BaseControlProvider: method renderWithMetadata must be redefined");
		},
		convertToInputType: function(oAdapter) {
			switch (oAdapter.semantics) {
				case FieldAdapter.Semantics.password:
					return InputType.Password;
				case FieldAdapter.Semantics.eMail:
					return InputType.Email;
				case FieldAdapter.Semantics.phoneNumber:
					return InputType.Tel;
				case FieldAdapter.Semantics.url:
					return InputType.Url;
				default:
					var ui5Type = oAdapter.ui5Type;

					switch (ui5Type) {
						case "sap.ui.model.odata.type.Int16":
						case "sap.ui.model.odata.type.Int32":
						case "sap.ui.model.odata.type.Int64":
						case "sap.ui.model.odata.type.Decimal":
						case "sap.ui.model.odata.type.Double":
							return InputType.Number;
						case "sap.ui.model.odata.type.TimeOfDay":
							return InputType.Time;
						case "sap.ui.model.odata.type.DateTime":
						case "sap.ui.model.odata.type.DateTimeBase":
							return InputType.DateTime;
						case "sap.ui.model.odata.type.DateTimeOffset":
						case "sap.ui.model.odata.type.Date":
							return InputType.Date;
						default:
							return InputType.Text;
					}
			}
		},
		/**
		 * Returns the provided data as mapping
		 * 
		 * @param {element} oControl The control that was provided
		 * @param {object} oAdapter The adapter
		 * @return {string} sQualifier The qualifier if supplied, undefined else
		 */
		getQualifier: function(oControl, oAdapter) {
			return this._getQualifier(oControl, oAdapter.getContext());
		},

		/**
		 * Returns the provided data as mapping
		 * 
		 * @param {element} oControl The control that was provided
		 * @param {string} sContextName The name of the context
		 * @return {string} sQualifier The qualifier if supplied, undefined else
		 */
		_getQualifier: function(oControl, sContextName) {
			var oResult = BaseControlProvider.getProvidedContexts(oControl, sContextName);

			if (oResult && oResult.metadata) {
				return oResult.metadata.qualifier;
			}

			return undefined;
		},
		isProvided: function(oControl) {
			return oControl._oProviderData._provided === true;
		},
		setProvided: function(oControl, bProvided) {
			oControl._oProviderData._provided = bProvided;
		}
	});

	/**
	 * Checks if the control provided
	 * 
	 * @param {element} oControl The managed object
	 * @return {boolean} true if the control is provided
	 * @public
	 */
	BaseControlProvider.isProvided = function(oControl) {
		return oControl._oProviderData._provided === true;
	};

	/**
	 * Sets the control provided
	 * 
	 * @param {element} oControl The managed object
	 * @public
	 */
	BaseControlProvider.setProvided = function(oControl, bProvided) {
		oControl._oProviderData._provided = bProvided;
	};

	/**
	 * Sets the provided property information from the metadata interpretation
	 * 
	 * @param {any} vBinding The binding as string
	 * @public
	 */
	BaseControlProvider.getAsBinding = function(vBinding, oControl) {
		var oBinding = null;

		if (typeof vBinding == 'string') {
			oBinding = ManagedObject.bindingParser(vBinding);
		} else if (typeof vBinding == 'object') {
			oBinding = vBinding;
		}

		var bIsBinding = true;

		// check for binding
		if (oBinding && oControl) {// every binding needs a path
			bIsBinding = oControl.isBinding(oBinding);
		}

		if (oBinding && bIsBinding) {
			return oBinding;
		}

		return undefined;
	};

	/**
	 * Get the binding as a string
	 */
	BaseControlProvider.getAsString = function(vBinding) {
		if (typeof vBinding == 'string') {
			return vBinding;
		} else if (typeof vBinding == 'object') {
			var sResult = JSON.stringify(vBinding);

			sResult = sResult.replace(new RegExp("\"path\"", "g"), "path");
			sResult = sResult.replace(new RegExp("\"parts\"", "g"), "parts");
			sResult = sResult.replace(new RegExp("\"parameters\"", "g"), "parameters");
			sResult = sResult.replace(new RegExp("\"expand\"", "g"), "expand");
			sResult.replace(new RegExp("\"name\"", "g"), "name");
			sResult = sResult.replace(new RegExp("\"adapter\"", "g"), "adapter");
			sResult = sResult.replace(new RegExp("\"", "g"), "'");

			return sResult;
		}
		return undefined;
	};

	/**
	 * Returns the provided data as mapping
	 * 
	 * @param {element} oControl The control that was provided
	 * @param {string} sContextName The name of the context
	 * @return {object} oResult a mapping containing the provided aggregations and their values
	 */
	BaseControlProvider.getProvidedData = function(oControl) {
		var oResult = {};

		if (oControl) {
			oResult = oControl._oProviderData;
			oResult = oResult.mProvidedProperties;
		}

		return oResult;

	};

	/**
	 * Returns the provided context information
	 * 
	 * @param {element} oControl The control that was provided
	 * @param {string} sContextName The name of the context
	 * @return {object} oResult a mapping containing the provided aggregations and their values
	 */
	BaseControlProvider.getProvidedContexts = function(oControl, sContextName) {
		var oResult = {};

		if (oControl) {
			oResult = oControl._oProviderData;
		}

		if (sContextName) {
			oResult = oResult.contexts[sContextName];
		}

		return oResult;

	};

	BaseControlProvider.mergeBindings = function(aBindings, fnFormatter) {
		var sBinding = "{ parts: [" + aBindings.join(",") + "] }";
		var oBindingInfo = BaseControlProvider.getAsBinding(sBinding);

		oBindingInfo.formatter = [
			fnFormatter
		];

		return oBindingInfo;
	};

// BaseControlProvider.extend = function(sName, oExtension) {
// var ControlProvider = new BaseControlProvider();
// jQuery.extend(ControlProvider, BaseControlProvider.prototype, oExtension);
// ControlProvider.getName = function() {
// return sName;
// };
//
// return ControlProvider;
// };

	BaseControlProvider.prototype._sName = "sap.ui.mdc.experimental.provider.BaseControlProvider";

	return BaseControlProvider;
});
