KanbanReport = function(config, rallyDataSource) {
    var that = this;

    var dialog, report, divId, msgDiv;
    var artifactTypes = config.artifactTypes;
    var reportName = config.reportName;

    var reportWidth = 500;
    var reportHeight = 350;

    that._onDialogClose = function(d, args) {
        d.destroy();
    };

    that._onLoad = function() {
        msgDiv.style.display = 'none';
    };

    that._displayReport = function() {
        dialog.display();
        report.display(divId, that._onLoad); //need to render dialog before we can populate the iframe with report

        //workaround for the sub-chart that adds 125px to height
        dojo.query("iframe").forEach(function(node, index, arr) {
            dojo.attr(node, "style", {
                height: reportHeight + "px",
                width: reportWidth + "px"
            });
        });
    };

    that._createReport = function() {
        var workItems,reportConfig;
        var dialogDiv = document.createElement("div");

        msgDiv = document.createElement("div");
        msgDiv.innerHTML = "Some reports may take up to 4 minutes to load.";
        dialogDiv.appendChild(msgDiv);

        var map = {Defect: 'D', HierarchicalRequirement: 'G'};

        if (artifactTypes.length === 2) {
            workItems = 'N';
        } else {
            workItems = map[artifactTypes];
        }

        reportConfig = {
            report: config.reportNumber,
            width: reportWidth - 25, //make chart a bit smaller than dialog
            height: reportHeight - 150, //EB account for sub-chart that takes up 125px
            work_items: workItems
        };

        //workaround issue with reports where applying filter on ScheduleState causes no data to be returned
        if (config.reportKanbanField !== "Schedule State") {
            reportConfig.filter_field = config.reportKanbanField;
        }

        if (config.tags) {
            reportConfig.tags = config.tags;
        }

        //window.top check ensures we are not running in the pop out
        if (!rally.sdk.util.Context.isInsideRally() && window.top === window.self) {
            reportConfig.project = rallyDataSource.projectOid;
            reportConfig.projectScopeDown = rallyDataSource.projectScopeDown;
            reportConfig.projectScopeUp = rallyDataSource.projectScopeUp;
        }

        var reportDiv = document.createElement("div");
        reportDiv.id = divId;
        dojo.addClass(reportDiv, "kanbanReport");
        dialogDiv.appendChild(reportDiv);

        report = new rally.sdk.ui.StandardReport(reportConfig);
        return dialogDiv;
    };

    that._createReportDialog = function() {
        if (!artifactTypes || artifactTypes.length <= 0) {
            rally.sdk.ui.AppHeader.showMessage("error", "No " + reportName + " data to show", 5000);
            return;
        }

        dialog = new rally.sdk.ui.basic.Dialog({title: reportName, draggable: true,
            closable: false, width: reportWidth + 25, height: reportHeight + 25, buttons:["Close"],
            content: that._createReport()});

        dialog.addEventListener("onButtonClick", that._onDialogClose);
        that._displayReport(divId);
    };

    this.display = function(element) {
        divId = element;
        that._createReportDialog();
    };
};