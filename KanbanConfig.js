/**
 Copyright (c) 2011  Rally Software Development Corp.  All rights reserved
 */

KanbanConfigPanel = function(rallyDataSource, onConfigHide) {
    rally.sdk.ComponentBase.call(this);

    this.getValidEvents = function() {
        return {onHide:"onHide"};
    };

    var that = this;
    var projectPrefRef, workspacePrefRef, currentPrefs = {};
    var stateDropdown, dialog;
    var allAttributes = {}, scheduleStateValues = {};
    var controls = [], rows = [], accessors = [];
    var hideCardsCheckBox, showTasksCheckBox, showDefectsCheckBox, showAgeCheckBox, showAgeTextBox, colorByArtifactTypeCheckBox, showSlaCheckBox, showSlaTextBox, showSlaStartDropdown, showSlaEndDropdown;

    var notMappedKey = "NotMapped";
    var notMappedVal = "-- Not Mapped --";

    //show list of kanbanable states
    that.display = function() {
        that._displayKanbanFieldDropdown(this._displayColumnPreferences);
    };

    that.show = function() {
        if (dialog) {
            dialog.show();
        }
    };

    that.hide = function() {
        if (dialog) {
            dialog.hide();
        }
    };

    that.displayDialog = function() {
        if (dialog) {
            return;
        }
        function createDialog(names) {
            var content = dojo.byId("configPanel");
            var title;
            dojo.byId("configPanel").style.visibility = "visible";
            if (names.projectName) {
                title = "Configure Settings for " + names.projectName + " Project";
            }
            else if (names.workspaceName) {
                title = "Configure Settings for Current Project";
            }
            else {
                title = "Configure Default Settings";
            }
            dialog = new rally.sdk.ui.basic.Dialog({
                id : new Date().toString(),
                title: title,
                width: 400,
                height: 350,
                draggable:false,
                closable:false,
                content: content
            });

            dialog.addEventListener("onHide", function() {
                that.fireEvent(that.getValidEvents().onHide, {});
            });
            dialog.display();
            that.displaySaveCancelFeatures();
            that._displayHelpDialog();
        }

        that._retrievePreferences(createDialog);
    };

    that.displaySaveCancelFeatures = function() {
        var buttonContainer = dojo.query(".buttonContainer")[0];
        dojo.addClass(buttonContainer, "saveCancelButtons");

        var saveButton = new rally.sdk.ui.basic.Button({text:"Save", value:"Save"});
        saveButton.display(buttonContainer, function() {
            that._storeValues(that._saveComplete);
        });

        var cancelLink = "<a href='' id='cancelLink'>Cancel</a>";
        dojo.place(cancelLink, buttonContainer);
        dojo.connect(dojo.byId('cancelLink'), "onclick", function(event) {
            dialog.hide();
            that._setValues();
            dojo.stopEvent(event);
        });
    };

    that._alterWipTextBox = function(textbox, args) {
        if (!args.value && args.value !== 0) {
            textbox.setValue("");
        }
        else if (!isNaN(args.value)) {
            textbox.setValue(Math.max(args.value, 0).toString());
        }
        else {
            textbox.setValue("");
        }
    };

    that._alterAgeTextBox = function(textbox, args) {
        if (!args.value || isNaN(args.value) || args.value < 1) {
            textbox.setValue(3);
        }
    };

    that._alterSlaTextBox = function(textbox, args) {
        if (!args.value || isNaN(args.value) || args.value < 1) {
            textbox.setValue(5);
        } else {
            textbox.setValue(args.value);
        }
    };

    that._alterStartSlaDropdown = function(box, args) { 
       //For now, Do nothing       
    };

    that._alterStopSlaDropdown = function(box, args) {
        //For now, Do nothing  
    };


    that._addControlToRow = function(row, divId, control, containerCss) {
        var td = document.createElement("td");
        var div = document.createElement("div");
        if (containerCss) {
            dojo.addClass(div, containerCss);
        }
        td.appendChild(div);
        div.id = divId;
        control.display(div);
        controls.push(control);
        row.appendChild(td);
    };

    that._createAllowedValueTableRow = function(allowedValue, fieldName) {
        var stringValue = allowedValue.StringValue;
        var row = document.createElement("tr");


        var columnNameContainer = document.createElement("td");
        columnNameContainer.innerHTML = stringValue || "-- No Entry --";
        row.appendChild(columnNameContainer);


        var checkbox = new rally.sdk.ui.basic.Checkbox({
            rememberChecked:false,
            checked:true
        });

        that._addControlToRow(row, stringValue + "-checkBox-" + rows.length, checkbox, "configCheckBox");

        var textBox = new rally.sdk.ui.basic.TextBox(
                {   value:'',
                    rememberValue:false
                });

        textBox.addEventListener("onChange", that._alterWipTextBox);
        that._addControlToRow(row, stringValue + "-textBox-" + rows.length, textBox, "wipTextBoxContainer");

        var stateDropdownConfig = {
            defaultValue: notMappedKey,
            rememberSelection:false,
            width:115
        };
        var mappingDropdown = new rally.sdk.ui.basic.Dropdown(stateDropdownConfig);

        if (fieldName === "Schedule State") {
            var notMappedScheduleStateVals = {};
            notMappedScheduleStateVals[notMappedKey] = notMappedVal;
            mappingDropdown.setItems(notMappedScheduleStateVals);
        }
        else {
            mappingDropdown.setItems(scheduleStateValues);
        }

        that._addControlToRow(row, stringValue + "-dropdown-" + rows.length, mappingDropdown);


        var accessor = {
            field:stringValue,
            get: function() {
                var result = {};
                var wipText = textBox.getValue();
                result.wip = wipText.length === 0 ? Infinity : wipText;
                //this turns undefined into false.
                result.displayField = !!checkbox.getChecked();
                var scheduleStateValue = mappingDropdown.getValue();
                if (scheduleStateValue !== notMappedKey) {
                    result.state = scheduleStateValue;
                }

                return result;
            },
            set:function(object) {
                if (object.state) {
                    mappingDropdown.setValue(object.state);
                } else {
                    mappingDropdown.setValue(notMappedVal);
                }

                var wipText = (object.wip === Infinity || object.wip === "Infinity"  ) ? "" : object.wip;
                textBox.setValue(wipText);
                checkbox.setChecked(object.displayField);
            }
        };
        accessors.push(accessor);
        return row;
    };

    that._destroyPreviousControls = function() {
        dojo.forEach(controls, function(control) {
            if (control && control.destroy) {
                control.destroy();
            }
        });
        controls = [];
        dojo.forEach(rows, function(row) {
            if (row) {
                dojo.destroy(row);
            }
        });
        rows = [];
    };

    that._checkReadyField = function(readyFieldExist) {
        if (!readyFieldExist) {
            var msgText = "To enable the 'ready to pull' feature, create a custom field named 'Ready' on the User Story and Defect work products.";
            var messageElement = document.createElement("div");
            messageElement.id = "appSettingsDialogMsg";

            var messageTextElement = document.createElement("span");
            messageElement.appendChild(messageTextElement);

            var textNode = document.createTextNode(msgText);
            if (messageTextElement.firstChild) {
                messageTextElement.replaceChild(textNode, messageTextElement.firstChild);
            } else {
                messageTextElement.appendChild(textNode);
            }

            dojo.addClass(messageElement, "configMessage");
            dojo.byId("msgContainer").appendChild(messageElement);
        }
    };

    that._displayTogglePreferences = function() {
        hideCardsCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Hide cards in last visible column if assigned to a release",
            showLabel:true,
            labelPosition:"after",
            checked: true,
            rememberChecked: true
        });
        hideCardsCheckBox.display("hideCardsCheckBox");

        showTasksCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Show task status for cards with tasks",
            showLabel:true,
            labelPosition:"after",
            checked: true,
            rememberChecked: true
        });
        showTasksCheckBox.display("showTasksCheckBox");

        showDefectsCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Show defect status for cards with defects",
            showLabel:true,
            labelPosition:"after",
            checked: true,
            rememberChecked: true
        });
        showDefectsCheckBox.display("showDefectsCheckBox");

        showAgeCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Show age for card after",
            showLabel:true,
            labelPosition:"after",
            checked: false,
            rememberChecked: true
        });
        showAgeCheckBox.display("showAgeCheckBox");

        showAgeTextBox = new rally.sdk.ui.basic.TextBox({
            label: " day(s) in column",
            showLabel:true,
            labelPosition:"after",
            width: 30,
            value: 3,
            rememberValue: true
        });
        showAgeTextBox.addEventListener("onChange", that._alterAgeTextBox);
        showAgeTextBox.display("showAgeTextBox");

        colorByArtifactTypeCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Color card headers by work item type",
            showLabel:true,
            labelPosition:"after",
            checked: false,
            rememberChecked: true
        });

        showSlaCheckBox = new rally.sdk.ui.basic.CheckBox({
            label:"Use",
            showLabel:true,
            labelPosition:"after",
            checked: false,
            rememberChecked: true
        });
        showSlaCheckBox.display("showSlaCheckBox");

        showSlaTextBox = new rally.sdk.ui.basic.TextBox({
            label: " day(s) for SLA",
            showLabel:true,
            labelPosition:"after",
            width: 30,
            value: 5,
            rememberValue: true
        });
        showSlaTextBox.addEventListener("onChange", that._alterSlaTextBox);
        showSlaTextBox.display("showSlaTextBox");

        var keys = [];
        for (key in scheduleStateValues) {
            if (key != notMappedKey) {
                keys.push(key);
            }
        }

        var dropDownItems = [];
        for (var i = 0; i < keys.length; i++) {
            dropDownItems.push({label: scheduleStateValues[keys[i]], value: i})
        }

        showSlaStartDropdown = new rally.sdk.ui.basic.Dropdown({
            label: "SLA start state ",
            showLabel: true,
            labelPosition: "before",
            items: dropDownItems,
            rememberSelection: true,
            defaultDisplayValue: dropDownItems[0],
            defaultValue: 0
        });
        showSlaStartDropdown.addEventListener("onChange", that._alterStartSlaDropdown);
        showSlaStartDropdown.display("showSlaStartDropdown");

        showSlaEndDropdown = new rally.sdk.ui.basic.Dropdown({
            label: "SLA end state ",
            showLabel: true,
            labelPosition: "before",
            items: dropDownItems,
            rememberSelection: true,
            defaultDisplayValue: dropDownItems[1],
            defaultValue: 1
        });
        showSlaEndDropdown.addEventListener("onChange", that._alterStopSlaDropdown);
        showSlaEndDropdown.display("showSlaEndDropdown");

        colorByArtifactTypeCheckBox.display("colorByArtifactTypeCheckBox");
    };

    that._displayColumnPreferences = function(dropdown, args) {
        that._destroyPreviousControls();
        accessors = [];
        var attributeObject = allAttributes[args.value];
        var tableBody = dojo.byId("configTableBody");

        dojo.forEach(attributeObject.AllowedValues, function(allowed) {
            var row = that._createAllowedValueTableRow(allowed, attributeObject.Name);
            rows.push(row);
            tableBody.appendChild(row);
        });
        that.displayDialog();
    };

    that._translateAllowedValuesToDropdownItems = function(values) {
        var items = {};
        items[notMappedKey] = notMappedVal;
        dojo.forEach(values, function(value) {
            items[value.StringValue] = value.StringValue;
        });
        return items;
    };

    that._displayHelpDialog = function() {
        var configHelpElement = dojo.byId("configHelp");
        dojo.addClass(configHelpElement, "configHelp");
        var help = new rally.sdk.ui.Help();
        help.setHelpTopic("238");
        help.display(configHelpElement);
    };

    that._displayKanbanFieldDropdown = function(callback) {
        allAttributes = {};

        function gatherAttributes(results) {

            try {
                var usableFields = {};
                var firstAttr,scheduleStateAttr,attributes = [];
                var readyFieldExist = false;

                dojo.forEach(results.types, function(type) {
                    attributes = attributes.concat(type.Attributes);
                });
                attributes.sort(function(a, b) {
                    var nameA = a.Name.toLowerCase();
                    var nameB = b.Name.toLowerCase();
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }
                    return 0;
                });

                dojo.forEach(attributes, function(attr) {
                    if (attr.Constrained && attr.AttributeType !== "OBJECT" && attr.AttributeType !== "COLLECTION") {
                        firstAttr = firstAttr || attr;
                        usableFields[attr.ElementName] = attr.Name;
                        allAttributes[attr.ElementName] = attr;
                    }
                    if (attr.Name == "Ready") {
                        readyFieldExist = true;
                    }
                    if (attr.Name == "Schedule State") {
                        scheduleStateAttr = attr;
                        scheduleStateValues = that._translateAllowedValuesToDropdownItems(attr.AllowedValues);
                    }
                });
                stateDropdown = new rally.sdk.ui.basic.Dropdown({
                    defaultValue : scheduleStateAttr.ElementName,
                    label:"Group By",
                    showLabel:true,
                    items:usableFields
                });

                stateDropdown.addEventListener("onLoad", callback);
                stateDropdown.addEventListener("onChange", callback);
                stateDropdown.display("stateDropdown");

                that._displayTogglePreferences();

                that._checkReadyField(readyFieldExist);

            }
            catch(ex) {
                if (ex.stack) {
                    rally.Logger.warn(ex.stack);
                }
                rally.Logger.warn(ex);
            }
        }

        rallyDataSource.find({
            type:"TypeDefinition",
            key: "types",
            query:'( Name = "Hierarchical Requirement" )',
            fetch:"Name,Attributes",
            project:null
        }, gatherAttributes);
    };

    //This wraps our controls to get their values
    that._getValues = function() {
        var values = {
            kanbanField:stateDropdown.getValue(),
            reportKanbanField:stateDropdown.getDisplayedValue(),
            fieldInfos:{},
            hideLastColumnIfReleased:hideCardsCheckBox.getChecked(),
            showTaskCompletion: showTasksCheckBox.getChecked(),
            showDefectStatus: showDefectsCheckBox.getChecked(),
            showAge: showAgeCheckBox.getChecked(),
            showAgeAfter: showAgeTextBox.getValue(),
            colorByArtifactType: colorByArtifactTypeCheckBox.getChecked(),
            showSla: showSlaCheckBox.getChecked(),
            showSlaFor: showSlaTextBox.getValue(),
            slaStart: showSlaStartDropdown.getDisplayedValue(),
            slaEnd: showSlaEndDropdown.getDisplayedValue()
        };
        rally.forEach(accessors, function(value) {
            values.fieldInfos[value.field] = value.get();

            //ensure we don't lose policy descriptions that already stored for that field
            if (currentPrefs && currentPrefs.fieldInfos &&
                    currentPrefs.fieldInfos[value.field] && currentPrefs.fieldInfos[value.field].policy) {
                values.fieldInfos[value.field].policy = currentPrefs.fieldInfos[value.field].policy;
            }
        });
        return values;
    };

    //this wraps the controls and sets their values.
    that._setValues = function() {
        hideCardsCheckBox.setChecked(currentPrefs.hideLastColumnIfReleased);
        showTasksCheckBox.setChecked(currentPrefs.showTaskCompletion);
        showDefectsCheckBox.setChecked(currentPrefs.showDefectStatus);
        showAgeCheckBox.setChecked(currentPrefs.showAge);
        showAgeTextBox.setValue(currentPrefs.showAgeAfter);
        colorByArtifactTypeCheckBox.setChecked(currentPrefs.colorByArtifactType);
        showSlaCheckBox.setChecked(currentPrefs.showSla);
        showSlaTextBox.setValue(currentPrefs.showSlaFor);
        showSlaStartDropdown.setDisplayedValue(currentPrefs.slaStart),
        showSlaEndDropdown.setDisplayedValue(currentPrefs.slaEnd)

        function setValues() {
            var fieldInfos = currentPrefs.fieldInfos;
            // remove the Event Handler from the dropdown
            if (deleter) {
                deleter.remove();
            }

            rally.forEach(accessors, function(accessor) {
                if (fieldInfos[accessor.field]) {
                    accessor.set(fieldInfos[accessor.field]);
                }
            });
        }

        if (stateDropdown.getValue() !== currentPrefs.kanbanField) {
            stateDropdown.setValue(currentPrefs.kanbanField);
            var deleter = stateDropdown.addEventListener("onChange", setValues);
        }
        else {
            setValues();
        }
    };

    that._retrievePreferences = function(/*function*/callback) {
        function populateConfigForm(results) {
            var workspacePref;
            var projectPref;
            if (results.length) {
                dojo.forEach(results, function(p) {
                    if (p.Project) {
                        //projectOid is a string need both strings to compare.
                        var projectRef = rally.sdk.util.Ref.getOidFromRef(p.Project) + "";
                        if (projectRef === rallyDataSource.projectOid) {
                            projectPref = p;
                            projectPrefRef = projectPref._ref;
                        }
                    }
                    if (p.Workspace) {
                        workspacePrefRef = p._ref;
                        workspacePref = p;
                    }
                });
                if (projectPref) {
                    currentPrefs = projectPref.Value;
                    that._setValues();
                    callback({projectName:projectPref.Project._refObjectName});
                }
                else if (workspacePref) {
                    currentPrefs = workspacePref.Value;
                    that._setValues();
                    callback({workspaceName:workspacePref.Workspace._refObjectName});
                }
            } else {
                callback({});
            }
        }

        rallyDataSource.preferences.getAppPreferences(populateConfigForm);
    };

    that._saveComplete = function() {
        dialog.hide();
        that._retrievePreferences(function() {
        });
        onConfigHide();
    };

    that._storeValues = function(callback) {

        function workspaceCallback(results) {

        }

        function errorCallback(results) {
            rally.Logger.warn(results);
        }

        function errorProjectCallback(results) {
            dialog.hide();
            rally.Logger.warn(results);
            if (results.Errors.length > 0) {
                var error = results.Errors[0];
                if (error.match(/user does not have preference write permission/i)) {
                    error = "You must have Editor permissions to setup the Kanban Board for the current project.";
                }
                rally.sdk.ui.AppHeader.showMessage("error", error, 10000);
            }
        }

        function updateAppPreference(pref) {

            currentPrefs = dojo.fromJson(pref.Value);
            var updatedPref = {_ref : projectPrefRef,
                Value:that._getValues()
            };
            rallyDataSource.preferences.update(updatedPref, callback, errorProjectCallback);
        }

        if (!projectPrefRef) {
            if (!workspacePrefRef) {
                rallyDataSource.preferences.createAppPreference(
                        {
                            Name: "Kanban/WipSettings",
                            Value: that._getValues(),
                            Workspace:"/Workspace/" + rallyDataSource.workspaceOid
                        },
                        workspaceCallback,
                        errorCallback);
            }
            rallyDataSource.preferences.createAppPreference(
                    {
                        Name: "Kanban/WipSettings",
                        Value: that._getValues(),
                        Project:"/Project/" + rallyDataSource.projectOid
                    },
                    callback,
                    errorProjectCallback);
        }
        else {

            //Re-read pref before saving so we don't clobber anything
            rallyDataSource.getRallyObject(projectPrefRef, updateAppPreference, errorCallback);

        }

    };

};