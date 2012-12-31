KanbanBoard = function(rallyDataSource, configShow) {
    var FILTER_FIELD = 'Tags.Name';

    var cardboard;
    var that = this;
    var checkBoxes = [];
    var filterByTagsDropdown, showAgeAfter,
            kanbanField, reportKanbanField,
            columns, scheduleStatesMap,
            hideLastColumnIfReleased, showTaskCompletion, showDefectStatus,
            lastState, artifactTypes,
            colorByArtifactType, policyCheckBox, showSla, showSlaFor, slaStart, slaEnd;

    that._showThroughputReport = function() {
        var config = {reportNumber: 180, reportName: "Throughput Report",
            reportKanbanField: reportKanbanField, artifactTypes: artifactTypes};
        if (filterByTagsDropdown && filterByTagsDropdown.getValue()) {
            config.tags = [filterByTagsDropdown.getValue()];
            config.reportName += " filtered by " + filterByTagsDropdown.getDisplayedValue() + " tag";
        }
        var report = new KanbanReport(config, rallyDataSource);
        report.display("cycleTimeReportDiv");
    };

    that._showCycleTimeReport = function() {
        var config = {reportNumber: 170, reportName: "Cycle Time Report",
            reportKanbanField: reportKanbanField, artifactTypes: artifactTypes};
        if (filterByTagsDropdown && filterByTagsDropdown.getValue()) {
            config.tags = [filterByTagsDropdown.getValue()];
            config.reportName += " filtered by " + filterByTagsDropdown.getDisplayedValue() + " tag";
        }
        var report = new KanbanReport(config, rallyDataSource);
        report.display("throughputReportDiv");
    };

    that._showNewStoryEditor = function() {
        rally.sdk.util.Navigation.popupCreatePage("hierarchicalrequirement", {iteration: 'u', release: 'u'});
    };

    that._showHidePolicies = function(checkbox, value) {
        if (value.checked) {
            that._showPolicies();
        } else {
            that._hidePolicies();
        }
    };

    that._showPolicies = function(button, args) {
        function resizeIt(textarea) {
            var str = textarea.value;
            var cols = textarea.cols;

            var linecount = 0;
            var newLines = str.split("\n");

            rally.forEach(newLines, function(line) {
                if (Math.ceil(line.length / cols) > 2) {
                    linecount += Math.ceil(line.length / cols); // take into account long lines
                } else {
                    linecount += 1;
                }
            });

            textarea.rows = linecount;
        }

        var columnPolicies = dojo.query('.columnPolicy');
        rally.forEach(columnPolicies, function(div) {
            dojo.removeClass(div, 'hidePolicy');
            dojo.style(div, 'display', 'none');
            var wipeArgs = {
                node: div,
                duration: 500
            };
            rally.forEach(dojo.query('textarea', div), function(textarea) {
                resizeIt(textarea);
            });
            dojo.fx.wipeIn(wipeArgs).play();
        });
    };

    that._hidePolicies = function(button, args) {
        var columnPolicies = dojo.query('.columnPolicy');
        rally.forEach(columnPolicies, function(div) {
            dojo.style(div, 'height', '');
            dojo.style(div, 'display', 'block');
            var wipeArgs = {
                node: div,
                duration: 500
            };
            dojo.fx.wipeOut(wipeArgs).play();
        });
    };

    that._createLayout = function(element) {
        rally.sdk.ui.AppHeader.setHelpTopic('238');
        rally.sdk.ui.AppHeader.showPageTools(true);

        rally.sdk.ui.AppHeader.addPageTool({
            key: "showCycleTimeReport",
            label: "Show Cycle Time Report",
            onClick: that._showCycleTimeReport
        });

        rally.sdk.ui.AppHeader.addPageTool({
            key: "showThroughputReport",
            label: "Show Throughput Report",
            onClick: that._showThroughputReport
        });

        if (rally.sdk.util.Context.isInsideRally() && window.top !== window.self) {
            rally.sdk.ui.AppHeader.addPageTool({
                key: "newStory",
                label: "Add New Story",
                onClick: that._showNewStoryEditor
            });
            rally.sdk.ui.AppHeader.addPageTool(rally.sdk.ui.PageTools.BuiltIn.OpenInNewWindow);
        }

        var headerDiv = document.createElement("div");
        element.appendChild(headerDiv);

        var controlDiv = document.createElement("div");
        dojo.addClass(controlDiv, "controlContainer");
        headerDiv.appendChild(controlDiv);

        var dropdownContainerDiv = document.createElement("div");
        dojo.addClass(dropdownContainerDiv, "dropdownContainer");
        controlDiv.appendChild(dropdownContainerDiv);

        var checkBoxContainerDiv = document.createElement("div");
        dojo.addClass(checkBoxContainerDiv, "typeFilterContainer");
        controlDiv.appendChild(checkBoxContainerDiv);

        var clearDiv = document.createElement("div");
        dojo.addClass(clearDiv, "clearFloats");
        headerDiv.appendChild(clearDiv);

        var filterByTagsSpan = document.createElement("span");
        dojo.addClass(filterByTagsSpan, "filterByTagsDropdown");
        dropdownContainerDiv.appendChild(filterByTagsSpan);

        function populateFilterByDropdown(results) {
            rally.forEach(results.tags, function(tag) {
                data.push({label: tag.Name, value: tag.ObjectID});
            });
            filterByTagsDropdown = new rally.sdk.ui.basic.Dropdown({label: "Filter by: ",
                items : data,
                rememberSelection:false,
                defaultValue: ""});
            filterByTagsDropdown.display(filterByTagsSpan);
            filterByTagsDropdown.addEventListener("onChange", that._updateBoardWithFilter);
        }

        var data = [
            { label: "", value: ""}
        ];
        rallyDataSource.findAll(
                {key    : 'tags',
                    order:   'Name',
                    type   : 'Tags',
                    fetch  : 'Name,ObjectID',
                    query  : '(Archived = False)' }, populateFilterByDropdown);

        var showSpan = document.createElement("span");
        showSpan.appendChild(document.createTextNode("Show:"));
        checkBoxContainerDiv.appendChild(showSpan);

        var userStoriesSpan = document.createElement("span");
        userStoriesSpan.id = "userStories";
        checkBoxContainerDiv.appendChild(userStoriesSpan);

        var userStoriesCheckBox = new rally.sdk.ui.basic.CheckBox({
            showLabel: true,
            label: "User Stories",
            labelPosition: "after",
            value: "HierarchicalRequirement",
            checked: true
        });
        checkBoxes.push(userStoriesCheckBox);
        userStoriesCheckBox.display(userStoriesSpan);

        var defectsSpan = document.createElement("span");
        defectsSpan.id = "defects";
        checkBoxContainerDiv.appendChild(defectsSpan);

        var defectsCheckBox = new rally.sdk.ui.basic.CheckBox({
            showLabel: true,
            label: "Defects",
            labelPosition: "after",
            value: "Defect",
            checked: true
        });
        checkBoxes.push(defectsCheckBox);
        defectsCheckBox.display(defectsSpan);

        var policySpan = document.createElement("span");
        policySpan.id = "policy-";
        dojo.addClass(policySpan, "policySpan");
        checkBoxContainerDiv.appendChild(policySpan);

        policyCheckBox = new rally.sdk.ui.basic.CheckBox({
            showLabel: true,
            label: "Policies",
            labelPosition: "after",
            value: "policy",
            checked: false,
            rememberChecked: true
        });
        policyCheckBox.display(policySpan);
        policyCheckBox.addEventListener("onChange", that._showHidePolicies);

        var kanbanBoard = document.createElement("div");
        kanbanBoard.id = "kanbanBoard";
        dojo.addClass(kanbanBoard, "kanbanBoard");
        element.appendChild(kanbanBoard);

        //Wire up events
        dojo.forEach(checkBoxes, function(checkBox) {
            checkBox.addEventListener("onChange", that._redisplayBoard);
        });
    };

    that._getColumn = function(field) {
        var showPolicy = policyCheckBox.getChecked();
        var policyDesc = field.policy || "";
        return {wipLimit:field.wip, policy:policyDesc, showPolicy:showPolicy};
    };

    that._getAndStorePrefData = function(callback) {
        function populateConfigForm(results) {
            var parsedResults = rally.sdk.data.Preferences.parse(results);
            var kanbanInfo;
            if (parsedResults.project.Kanban) {
                kanbanInfo = parsedResults.project.Kanban.WipSettings;
            } else if (parsedResults.workspace.Kanban) {
                kanbanInfo = parsedResults.workspace.Kanban.WipSettings;
            }

            if (kanbanInfo) {
                kanbanField = kanbanInfo.kanbanField;
                reportKanbanField = kanbanInfo.reportKanbanField;
                hideLastColumnIfReleased = kanbanInfo.hideLastColumnIfReleased;
                showTaskCompletion = kanbanInfo.showTaskCompletion;
                showDefectStatus = kanbanInfo.showDefectStatus;
                colorByArtifactType = kanbanInfo.colorByArtifactType;
                showSla = kanbanInfo.showSla;
                showSlaFor = kanbanInfo.showSlaFor;
                slaStart = kanbanInfo.slaStart
                slaEnd = kanbanInfo.slaEnd

                if (kanbanInfo.showAge) {
                    showAgeAfter = kanbanInfo.showAgeAfter;
                } else {
                    showAgeAfter = null;
                }
                columns = {};
                scheduleStatesMap = {};
                rally.forEach(kanbanInfo.fieldInfos, function(fieldInfo, key) {
                    if (fieldInfo.displayField) {
                        columns[key] = that._getColumn(fieldInfo);
                        scheduleStatesMap[key] = fieldInfo.state;
                        lastState = key;                        
                    }
                });

                callback();
            }
            else {
                //no prefs found fire up dialog
                configShow();
            }
        }

        rallyDataSource.preferences.getAppPreferences(populateConfigForm);
    };

    that._onBeforeItemUpdated = function(c, args) {
        if (args.type === "move") {           
            args.fieldsToUpdate.Ready = false;

            if (scheduleStatesMap[args.fieldsToUpdate[args.attribute]]) {
                args.fieldsToUpdate.ScheduleState = scheduleStatesMap[args.fieldsToUpdate[args.attribute]];                
            }           
        }

    };

    that._updateBoardWithFilter = function(dropdown) {
        if (cardboard) {
            cardboard.filterBoard({field: FILTER_FIELD, value: dropdown.getDisplayedValue()});
        } else {
            that._redisplayBoard();
        }
    };

    that._redisplayBoard = function() {
        function displayBoard() {
            artifactTypes = [];
            var cardboardConfig = {
                types           : [],
                attribute       : kanbanField,
                sortAscending   : true,
                order           : "Rank",
                cardRenderer    : KanbanCardRenderer,
                cardOptions     : {
                    showTaskCompletion: showTaskCompletion,
                    showDefectStatus: showDefectStatus,
                    showAgeAfter: showAgeAfter,
                    colorByArtifactType: colorByArtifactType,
                    showSla: showSla,
                    showSlaFor: showSlaFor,
                    slaStart: slaStart,
                    slaEnd: slaEnd
                },
                columnRenderer  : KanbanColumnRenderer,
                columns         : columns,
                fetch           : "Name,FormattedID,Owner,ObjectID,Rank,Ready,Blocked,LastUpdateDate,Tags,State,ScheduleState,AcceptedDate"
            };


            if (showTaskCompletion) {
                cardboardConfig.fetch += ",Tasks";
            }

            if (showDefectStatus) {
                cardboardConfig.fetch += ",Defects";
            }

            if (hideLastColumnIfReleased) {
                cardboardConfig.query = new rally.sdk.util.Query("Release = null").or(kanbanField + " != " + '"' + lastState + '"');
            }

            if (filterByTagsDropdown && filterByTagsDropdown.getDisplayedValue()) {
                cardboardConfig.cardOptions.filterBy = {field: FILTER_FIELD, value: filterByTagsDropdown.getDisplayedValue()};
            }
            //Build types based on checkbox selections

            dojo.forEach(checkBoxes, function(checkBox) {
                if (checkBox.getChecked()) {
                    cardboardConfig.types.push(checkBox.getValue());
                }
            });

            if (cardboard) {
                cardboard.destroy();
            }
            artifactTypes = cardboardConfig.types;

            cardboard = new rally.sdk.ui.CardBoard(cardboardConfig, rallyDataSource);

            cardboard.addEventListener("preUpdate", that._onBeforeItemUpdated);
            cardboard.display("kanbanBoard");
        }
        that._getAndStorePrefData(displayBoard);
    };

    that.display = function(element) {

        //Build app layout
        this._createLayout(element);

        //Redisplay the board
        this._redisplayBoard();
    };
};