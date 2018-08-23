sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/odata/Annotations", "sap/ui/mdc/experimental/provider/adapter/base/FieldAdapter"
], function(Annotations, FieldAdapter) {
	"use strict";
	return {
		buildSchemaCache: function(oODataAdapter) {
			oODataAdapter._schemaCache = oODataAdapter._schemaCache || {};
			var sKey = oODataAdapter.oMetaModel.getId() + ">" + oODataAdapter.sMetaPath;

			if (!oODataAdapter._schemaCache[sKey]) {
				oODataAdapter._schemaCache[sKey] = oODataAdapter.oMetaModel.getProperty(oODataAdapter.sMetaPath);
				oODataAdapter.schema = oODataAdapter._schemaCache[sKey];
				this.precalculateFieldControl(oODataAdapter);
			} else {
				oODataAdapter.schema = oODataAdapter._schemaCache[sKey];
			}
		},
		getQualifiers: function(oODataAdapter) {
			var aQualifiers = [], mAnnotations = {}, aKeySplit;

			if (oODataAdapter.sVersion == "4.0") {
				mAnnotations = jQuery.extend({}, oODataAdapter.oMetaContext.getObject("@"), oODataAdapter.oMetaContext.getObject("./@"));
			} else {
				mAnnotations = oODataAdapter.schema;
			}

			for ( var key in mAnnotations) {
				if (key.indexOf("#") != -1) {
					aKeySplit = key.split("#");

					aKeySplit.shift();
					if (aQualifiers.indexOf(aKeySplit[0]) == -1) {
						aQualifiers.push(aKeySplit[0]);
					}
				}
			}

			return aQualifiers;
		},
		getAnnotation: function(sAnnotation, oODataAdapter, sQualifier) {
				var sAnno = sAnnotation;
				
				if (sQualifier) {
					sAnno += "#" + sQualifier;
				}
			if (oODataAdapter.sVersion == "4.0") {
				return oODataAdapter.oMetaContext.getObject(sAnno);
			} else {
				var oAnnotation = oODataAdapter.schema;
				var aParts = sAnno.split("/");
				var iIndex = 0;

				while (oAnnotation && aParts[iIndex]) {
					oAnnotation = oAnnotation[aParts[iIndex]];
					iIndex++;
				}

				return oAnnotation;
			}
		},
		_normalizeAnnotation: function(sAnnotation, oDataAdapter) {
			var sPrefix = oDataAdapter.sVersion == "4.0" ? "@" : "";
			return sPrefix + sAnnotation;
		},
		precalculateFieldControl: function(oODataAdapter) {
			var sAnno = this._normalizeAnnotation(Annotations.FIELD_CONTROL, oODataAdapter);
			var oFieldControl = this.getAnnotation(sAnno, oODataAdapter);

			if (oFieldControl) {
				var fieldControl = {};
				oODataAdapter._schemaCache[oODataAdapter.sMetaPath].$fieldControl = fieldControl;
				var oEnumMember = oFieldControl.EnumMember || oFieldControl.$EnumMember;

				if (oEnumMember) {

					switch (oEnumMember) {
						case Annotations.FIELD_CONTROL_TYPE.HIDDEN:
							fieldControl.visible = false;
							fieldControl.hidden = true;
							fieldControl.editable = false;
							fieldControl.readonly = true;
							fieldControl.required = false;
							break;
						case Annotations.FIELD_CONTROL_TYPE.MANDATORY:
							fieldControl.visible = true;
							fieldControl.hidden = false;
							fieldControl.editable = true;
							fieldControl.readonly = false;
							fieldControl.required = true;
							break;
						case Annotations.FIELD_CONTROL_TYPE.READONLY:
							fieldControl.visible = true;
							fieldControl.hidden = false;
							fieldControl.editable = false;
							fieldControl.readonly = true;
							fieldControl.required = false;
							break;
						default:
							fieldControl.visible = true;
							fieldControl.hidden = false;
							fieldControl.editable = true;
							fieldControl.readonly = true;
							fieldControl.required = false;
							break;
					}
				} else {
					var sPath = oFieldControl.Path || oFieldControl.$Path;
					if (oODataAdapter.getModelName()) {
						sPath = oODataAdapter.getModelName() + ">" + sPath;
					}

					fieldControl.visible = "{= ${" + sPath + "} !== 0}";
					fieldControl.hidden = "{= ${" + sPath + "} === 0}";
					fieldControl.editable = "{= ${" + sPath + "} !== 1}";
					fieldControl.readonly = "{= ${" + sPath + "} === 1}";
					fieldControl.required = "{= ${" + sPath + "} === 7}";
				}
			}
		},
		enabled: function(oODataAdapter) {
			var oUpdatableAnno = this.getAnnotation(this._normalizeAnnotation(Annotations.IMMUTABLE, oODataAdapter), oODataAdapter) || this.getAnnotation(this._normalizeAnnotation(Annotations.COMPUTED, oODataAdapter), oODataAdapter);
			var bEnabled = oUpdatableAnno ? oUpdatableAnno == "false" : true;

			if (bEnabled && oODataAdapter.schema.$fieldControl) {
				bEnabled = oODataAdapter.schema.$fieldControl.editable;
				oODataAdapter.setValue("!enabled", oODataAdapter.schema.$fieldControl.readonly);
			} else {
				oODataAdapter.setValue("!enabled", !bEnabled);
			}

			return bEnabled;
		},
		required: function(sReferenceAnno, oODataAdapter) {
			var oRequiredAnno = this.getAnnotation(sReferenceAnno, oODataAdapter);

			var bRequired = oRequiredAnno ? oRequiredAnno == "false" : false;

			if (oODataAdapter.schema.$fieldControl) {
				bRequired = oODataAdapter.schema.$fieldControl.required;
			} else {
				bRequired = bRequired && oODataAdapter.enabled;
			}

			return bRequired;
		},
		visible: function(sReferenceAnno, oODataAdapter) {
			var oHiddenAnno = this.getAnnotation(sReferenceAnno, oODataAdapter);
			var bVisible = oHiddenAnno ? !oHiddenAnno : true;

			if (bVisible && oODataAdapter.schema.$fieldControl) {
				bVisible = oODataAdapter.schema.$fieldControl.visible;
				oODataAdapter.setValue("!visible", oODataAdapter.schema.$fieldControl.hidden);
			} else {
				oODataAdapter.setValue("!visible", !bVisible);
			}
			return bVisible;
		},
		asSemantics: function(oODataBaseAdapter, FieldAdapter) {
			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.PASSWORD, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.password;
			}

			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.EMAIL, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.eMail;
			}

			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.PHONE, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.phoneNumber;
			}

			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.URL, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.url;
			}

			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.UNIT, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.measure;
			}

			if (this.getAnnotation(this._normalizeAnnotation(Annotations.SEMANTICS.CURRENCY, oODataBaseAdapter), oODataBaseAdapter) != null) {
				return FieldAdapter.Semantics.currency;
			}
			return FieldAdapter.Semantics.text;
		},
		stripKeyPredicate: function(sSegment) {
			var iPos = sSegment.indexOf("(");
			return iPos >= 0 ? sSegment.slice(0, iPos) : sSegment;
		},
		getValueHelpParamterType: function(sAnnotation) {
			switch (sAnnotation) {
				case Annotations.VALUE_LIST_PARAMETER.OUT:
					return FieldAdapter.ValueHelpParameterType.to;
				case Annotations.VALUE_LIST_PARAMETER.IN:
					return FieldAdapter.ValueHelpParameterType.from;
				case Annotations.VALUE_LIST_PARAMETER.IN_OUT:
					return FieldAdapter.ValueHelpParameterType.fromTo;
				case Annotations.VALUE_LIST_PARAMETER.FILTER_ONLY:
					return FieldAdapter.ValueHelpParameterType.filterOnly;
				default:
					return FieldAdapter.ValueHelpParameterType.displayOnly;
			}
		},
		getVisualAnno: function(sVizAnnoKey, oODataAdapter, sQualifier) {
			var sVisualization, oAnno, sVizAnno;

			// else look for a presentation variant
			var oPresentationVariant = this.presentationVariant(sQualifier, oODataAdapter);

			if (oPresentationVariant && oPresentationVariant.Visualizations) {
				for (var i = 0; i < oPresentationVariant.Visualizations.length; i++) {
					sVisualization = oPresentationVariant.Visualizations[i];
					if (sVisualization && sVisualization.startsWith("@" + sVizAnnoKey)) {
						if (oODataAdapter.sVersion == "4.0") {
							sVizAnno = "./" + sVisualization;// visual annotation is on the entity type
						} else {
							sVizAnno = sVisualization.substr(1);
						}
					}
				}
			}

			if (sVizAnno) {
				oAnno = this.getAnnotation(sVizAnno, oODataAdapter);
			}

			if (!oAnno) {
				sVizAnno = oODataAdapter.sVersion == "4.0" ? "./@" : "";
				sVizAnno += sVizAnnoKey;

				oAnno = this.getAnnotation(sVizAnno, oODataAdapter, sQualifier);
			}

			return oAnno;
		},
		presentationVariant: function(sQualifier, oODataAdapter) {
			var sVariantKey = "$presentationVariant", sAnno = oODataAdapter.sVersion == "4.0" ? "./@" : "";

			sAnno += Annotations.PRESENTATION_VARIANT;

			if (!oODataAdapter.schema[sVariantKey]) {
				var oPresentationVariant = this.getAnnotation(sAnno, oODataAdapter, sQualifier);

				if (!oPresentationVariant) {
					return;
				}

				oODataAdapter.schema[sVariantKey] = {
					MaxItems: oPresentationVariant.maxItems,
					Visualizations: [],
					SortOrder: []
				};

				for (var i = 0; i < oPresentationVariant.Visualizations.length; i++) {
					var sAnnoPath = oODataAdapter.sVersion == "4.0" ? oPresentationVariant.Visualizations[i].$AnnotationPath.trim() : oPresentationVariant.Visualizations[i].AnnotationPath.trim();

					oODataAdapter.schema[sVariantKey].Visualizations.push(sAnnoPath);
				}

				for (var i = 0; i < oPresentationVariant.SortOrder.length; i++) {
					oODataAdapter.schema[sVariantKey].SortOrder.push({
						Property: oODataAdapter.sVersion == "4.0" ? oPresentationVariant.SortOrder[i].Property.$PropertyPath : oPresentationVariant.SortOrder[i].Property.PropertyPath,
						Descending: oPresentationVariant.SortOrder[i].Descending ? oPresentationVariant.SortOrder[i].Descending : false
					});
				}
			}

			return oODataAdapter.schema[sVariantKey];
		}

	};

});
