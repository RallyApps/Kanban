var rallyScheduleStateOrder = null;

KanbanCardRenderer = function(column, item, options) {
    rally.sdk.ui.cardboard.BasicCardRenderer.call(this, column, item, options);    
    var that = this;
    var cardContent,card,cardMenu;
    this.getItem = function() {
        return dojo.clone(item);
    };
    this.selectCard = function() {
        var expand = dojo.animateProperty({
            node : cardMenu,
            properties : {
                height : {end : dojo.style(cardMenu, "lineHeight")},
                rate: 7
            }
        });
        expand.play();
        dojo.addClass(cardMenu, "expanded");
        KanbanCardRenderer.SelectedCard = that;
    };

    this.unselectCard = function() {
        var shrink = dojo.animateProperty({
            node : cardMenu,
            properties : {
                height : {end : 0},
                rate: 7
            }
        });
        shrink.play();
        dojo.removeClass(cardMenu, "expanded");
        KanbanCardRenderer.SelectedCard = null;
    };

    this._contentClicked = function() {
        that.fireEvent(that.getValidEvents().onContentClick, {
            item: item
        });
    };


    this._headerMouseOver = function(event) {
        var headerElement = event.srcElement;
        var timer;
        var delay = 3000;
        var tooltip;
        var link;

        function removeTooltip() {
            if (tooltip && tooltip.hide) {
                dojo.disconnect(link);
                tooltip.hide();
            }
            clearTimeout(timer);
        }


        function showTooltip() {
            var tooltipDiv = document.createElement("div");
            headerElement.appendChild(tooltipDiv);
            // attach to the right of the formatted id
            tooltip = rally.sdk.ui.basic.Tooltip.show(headerElement.parentNode.firstChild, "Drag to move story, click to show toolbar", "before", 3000);

        }

        link = dojo.connect(headerElement, "onmouseout", removeTooltip);
        timer = setTimeout(showTooltip, delay);
    };

    this._headerClicked = function() {
        var previousSelection = KanbanCardRenderer.SelectedCard;
        if (KanbanCardRenderer.SelectedCard) {
            KanbanCardRenderer.SelectedCard.unselectCard();
        }

        if (previousSelection !== that) {
            that.selectCard();
        }

        that.fireEvent(that.getValidEvents().onHeaderClick, {
            item: item
        });
    };

    this.getValidEvents = function() {
        return {
            onContentClick:"onContentClick",
            onHeaderClick: "onHeaderClick",
            onItemUpdate: "onItemUpdate"
        };
    };

    this.applyFilter = function() {

        function applyFilterClass() {
            dojo.removeClass(card, 'filterByFade');
            dojo.addClass(card, 'filterByShow');
        }

        if (options.filterBy.value && options.filterBy.value.length > 0) { //if the filter value is not empty string
            dojo.removeClass(card, 'filterByShow');
            dojo.addClass(card, 'filterByFade');

            var filterFieldSplit = options.filterBy.field.toString().split('.');
            var filterField = filterFieldSplit[0];
            var filterAttr = filterFieldSplit[filterFieldSplit.length - 1];

            if (item[filterField] === options.filterBy.value) { // field is string or number
                applyFilterClass();
            } else if (filterField !== filterAttr) {
                if (item[filterField] && item[filterField][filterAttr] === options.filterBy.value) { // field is an object
                    applyFilterClass();
                } else { // field is a collection
                    rally.forEach(item[filterField], function(field) {
                        if (field[filterAttr] === options.filterBy.value) {
                            applyFilterClass();
                        }
                    });
                }
            }
        } else { //if the filter value is empty string, show card
            applyFilterClass();
        }
    };

    this.applyArtifactTypeStyle = function() {
        dojo.addClass(card, rally.sdk.util.Ref.getTypeFromRef(item._ref));
    };

    this._getColumnAgeDays = function() {
        var daysOld = 0;

        function getLastStateChange() {
            var revisions = item.RevisionHistory.Revisions;
            var lastStateChangeDate = "";

            rally.forEach(revisions, function(revision) {

                if (lastStateChangeDate.length === 0) {
                    var attr = options.attribute.toUpperCase();                    
                    if (revision.Description.indexOf(attr + " changed from") !== -1) {
                        lastStateChangeDate = revision.CreationDate;
                    }
                    if (revision.Description.indexOf(attr + " added") !== -1) {
                        lastStateChangeDate = revision.CreationDate;
                    }
                }
            });
            return lastStateChangeDate || item.CreationDate;
        }

        var lastStateDate = getLastStateChange();

        var lastUpdateDate = rally.sdk.util.DateTime.fromIsoString(lastStateDate);        
        return rally.sdk.util.DateTime.getDifference(new Date(), lastUpdateDate, "day");
    };
    
    //1. Get the possible rally schedule states so we can determine the position of this story in relation to the start and stop SLA states.
    //2. Get the full rally object
    //3. Get the revision history
    //4. Run display logic    
    this._getFullRallyItem = function(card){  

        //1. Get the rally states so we can determine the order.
        getRallyScheduleStateOrder();
        
        function getRallyScheduleStateOrder(){            
            var queryConfig = {type: 'Hierarchical Requirement',
                    key : 'storyStates', 
                    attribute: 'Schedule State',
                    order: 'Schedule State desc'
                    };
            var rallyDataSource = new rally.sdk.data.RallyDataSource();
            rallyDataSource.find(queryConfig, function queryCallBack(obj){cardStateCheck(obj);}, errorCallBack); 
        } 

        function cardStateCheck(statesObj){           
            var currentStateVal = that.getRallyStateVal(item.ScheduleState, statesObj.storyStates);
            var startSlaTimerStateVal = that.getRallyStateVal(options.slaStart, statesObj.storyStates);
            var stopSlaTimerStateVal = that.getRallyStateVal(options.slaEnd, statesObj.storyStates);

            //If the user story has been accepted then return.
            if(item.AcceptedDate != null && item.AcceptedDate != undefined){
               return;
            }   

            //If the User story has reached (or is past) its stop SLA state then return.
            if(options.slaEnd == item.ScheduleState || currentStateVal > stopSlaTimerStateVal){
                return;
            } 

            /*
              If the User Story is not currently in a state that is less than its start sla then return.
              The scenario here is if a user story has been moved beyond its start sla state but has subsequently moved back.
            */
            if(currentStateVal < startSlaTimerStateVal){
                return;
            }

            getFullRallyItem(statesObj);
        }

        //Get the full rally item.
        function getFullRallyItem(statesObj){
            var itemRef = rally.sdk.util.Ref.getRef(item);        
            var rallyDataSource = new rally.sdk.data.RallyDataSource();
            rallyDataSource.getRallyObject(itemRef, function callBack(obj){getAllRevisions(obj, statesObj);}, errorCallBack);
        }

        function getAllRevisions(itemObj, statesObj){
            var revHistRef = rally.sdk.util.Ref.getRef(itemObj.RevisionHistory);            
            var rallyDataSource = new rally.sdk.data.RallyDataSource();
            
            rallyDataSource.getRallyObject(revHistRef, function refCallBack(obj){buildDueDateCall(card, itemObj, obj, statesObj);}, errorCallBack);
        }

        //Build the SLA logic.
        function buildDueDateCall(card, itemObj, revisions, statesObj){
            that._getDueDate(card, itemObj, revisions, statesObj);
        }

        function errorCallBack(response){           
            console.log("ERROR!!!!!  " + JSON.stringify(response));
        }

    };

    this.getRallyStateVal = function(rallyState, storyStates){                
        for(var i = 0;i < storyStates.length;i++){
            if(rallyState == storyStates[i]){
                return i;
            }
        }
        return NaN;
    };

    this._getDueDate = function(card, itemObj, revisionObj, statesObj) {
        
        //var userStory = itemObj;
        var revHist = revisionObj;        
        
        var sla = options.showSlaFor;
        var startSlaTimerState = options.slaStart;

        //Determine if this user story has entered the SLA start date if so capture the date it entered.
        function getSlaStartStateChange() {            
            var dueDateStartChangeDate = "";
            var revisions = revHist.Revisions;           
            for(var i = 0; i < revisions.length; i++) { 
                var revision = revisions[i];              
                if (dueDateStartChangeDate.length === 0) {
                    if (revision.Description.indexOf("SCHEDULE STATE changed from") !== -1 && revision.Description.indexOf(" to [" + startSlaTimerState + "]") !== -1) {

                        var descr = revision.Description;
                        descr = descr.slice(descr.indexOf("SCHEDULE STATE changed from ["), -1).replace("SCHEDULE STATE changed from [", "");                        
                        descr = descr.slice(0,descr.indexOf("]"));

                        if(that.getRallyStateVal(descr, statesObj.storyStates) > that.getRallyStateVal(startSlaTimerState, statesObj.storyStates)){
                            //Do nothing because someone has moved a card back to the starting state and it is still on the board but we want to take the earlier time.
                        }
                        else{
                            dueDateStartChangeDate = revision.CreationDate;
                        }                                       
                    }                    
                }               
            }
            return dueDateStartChangeDate;
        }

        function getDayOrDays(num){
            if(num > 1){
                return "days";
            }
            else if(num == 1){
                return "day";
            }
            else if(num == 0){
                return "days";
            }
        }

        function getWrkDayMsg(wrkDays){
            if(wrkDays > 1){
                return wrkDays + " days on the board.";
            }
            else if(wrkDays === 1 || wrkDays === 0){
                return "This card was pulled today.";
            }
        }

        function addToolTip(elem, msg){
             var tooltip = new rally.sdk.ui.basic.Tooltip({
                message: msg,
                position: "below"
            });
            tooltip.display(elem);
        }

        function significantDateFormater(date) {
            date.setHours(00);
            date.setMinutes(00);
            date.setSeconds(00);
            date.setMilliseconds(000);
            return date;
        }


        var slaStartDate = getSlaStartStateChange();
        /*
        Sometimes the state of an item does not reflect its actual state.
        For intance: If someone creates a user story and sets the state to "Defined".
        Then there will be no revision history of the item moving into the Rally state we are looking for.
        Maybe we ought to display a message?
        */
        if (slaStartDate === "") {
            return;
        }

        slaStartDate = rally.sdk.util.DateTime.fromIsoString(slaStartDate);

        //set the sla start date to the beginning of the day
        slaStartDate = significantDateFormater(slaStartDate);       
        var today = significantDateFormater(new Date());
        
        var cardDueDate = that.dateSlaDueDateMinusWeekends(slaStartDate, sla);
        var dueDateDiff = rally.sdk.util.DateTime.getDifference(cardDueDate, today, "day");

        var formattedDate = rally.sdk.util.DateTime.format(cardDueDate, "EEE MMM dd");

        //If the diff is negative we are past the due date.
        if (dueDateDiff < 0) {
            var daysPast = that.calcNumOfWrkDaysBetweenTwoDates(cardDueDate, today, true);
            var pastSLATextNode = document.createTextNode("SLA: " + daysPast + " " + getDayOrDays(daysPast) + " past (Due: " + formattedDate + ")");
            var slaDiv = that.createSlaDiv(card);
            slaDiv.appendChild(pastSLATextNode);
            dojo.addClass(slaDiv, "pastsla");

            var msg = "This Card is past its SLA of " + sla + " day(s)."
            var elem = dojo.query('.slastatus', card)[0];
            addToolTip(elem, msg);

            return;
        }
        else if (dueDateDiff === 1) {
            var onedaySLATextNode = document.createTextNode("SLA: " + dueDateDiff + " " + getDayOrDays(dueDateDiff) + " left (Due: " + formattedDate + ")");

            var slaDiv = that.createSlaDiv(card);
            slaDiv.appendChild(onedaySLATextNode);
            dojo.addClass(slaDiv, "pastsla");

            var wrkDays = that.calcNumOfWrkDaysBetweenTwoDates(slaStartDate, today, false);
            var msg = getWrkDayMsg(wrkDays);
            var elem = dojo.query('.slastatus', card)[0];
            addToolTip(elem, msg);

            return;
        }
        else if (dueDateDiff === 0) {
            var onedaySLATextNode = document.createTextNode("SLA: DUE TODAY (" + formattedDate + ")");

            var slaDiv = that.createSlaDiv(card);
            slaDiv.appendChild(onedaySLATextNode);
            dojo.addClass(slaDiv, "pastsla");

            var wrkDays = that.calcNumOfWrkDaysBetweenTwoDates(slaStartDate, today, false);
            var msg = getWrkDayMsg(wrkDays);
            var elem = dojo.query('.slastatus', card)[0];
            addToolTip(elem, msg);

            return;
        }
        else if (dueDateDiff > 1) {
			var daysLeft = that.calcNumOfWrkDaysBetweenTwoDates(today, cardDueDate, false);
            var daysOnBoard = document.createTextNode("SLA: " + daysLeft + " " + getDayOrDays(daysLeft) + " left (Due: " + formattedDate + ")");
            that.createSlaDiv(card).appendChild(daysOnBoard);

            var wrkDays = that.calcNumOfWrkDaysBetweenTwoDates(slaStartDate, today, false);
            var msg = getWrkDayMsg(wrkDays);
            var elem = dojo.query('.slastatus', card)[0];
            addToolTip(elem, msg);

            return;
        }
    };

    this.calcNumOfWrkDaysBetweenTwoDates = function (startDate, endDate, inclusive) {        
        var tempDate = new Date(startDate);        
		var i;
		if(inclusive){
			i = 0;
		}
		else{
			i = 1;
		}
        while (tempDate.getTime() < endDate.getTime()) {            
            if (!that.isAWorkDay(tempDate)) {
                //Increment the date but, DO NOT increment the counter!
                tempDate = new Date(tempDate.setDate(tempDate.getDate() + 1));
            }
            else {
                tempDate = new Date(tempDate.setDate(tempDate.getDate() + 1));
                i++;
            }
        }
        return i;
    };

    this.dateSlaDueDateMinusWeekends = function(dateSlaStarted, sla){
        var startDate = new Date(dateSlaStarted);
        
        var tempDate = new Date(startDate);
        var i = 1;
        while(i < sla || !that.isAWorkDay(tempDate)){        
            if(!that.isAWorkDay(tempDate)){
                //Increment the date but, DO NOT increment the counter!
                tempDate = new Date(tempDate.setDate(tempDate.getDate() + 1));                
            }
            else{
                tempDate = new Date(tempDate.setDate(tempDate.getDate() + 1));
                i++;
            }
        }

        return tempDate;
    };

    this.isAWorkDay = function(aDate){
        var SATURDAY = 6;
        var SUNDAY = 0;

        if(aDate.getDay() === SATURDAY || aDate.getDay() === SUNDAY){
            return false;
        }
        else{
            return true;
        }         
    };

    this.createSlaDiv = function(card){
        var contentDiv = dojo.query('.cardContent', card)[0];            
        var slaStatusDiv = document.createElement("div");
        dojo.addClass(slaStatusDiv, "slastatus");
        contentDiv.appendChild(slaStatusDiv);
        return slaStatusDiv;
    };

    this.updateCard = function(node) {
        card = node.firstChild;
        that._populateCard();        
    };

    this._populateCard = function() {
        var idDiv = dojo.query('.leftCardHeader', card)[0];
        var link = new rally.sdk.ui.basic.Link({item: item});
        dojo.empty(idDiv);
        link.display(idDiv);

        var ownerImg = dojo.query('.cardOwner', card)[0];
        var ownerName = dojo.query('.cardOwnerName', card)[0];
        dojo.empty(ownerName);

        if (item.Owner) {
            ownerImg.setAttribute("src", rally.sdk.util.Ref.getUserImage(item.Owner._ref));
            ownerName.appendChild(document.createTextNode(item.Owner._refObjectName));
        }
        else {
            ownerImg.setAttribute("src", rally.sdk.loader.launcherPath + "/../images/profile-mark-18.png");
            ownerName.appendChild(document.createTextNode("No Owner"));
        }

        var cardName = dojo.query('.cardName', card)[0];
        cardName.innerHTML = item.Name;

        var tasksDiv = dojo.query('.tasks', card);

        if (tasksDiv.length > 0) {
            tasksDiv = tasksDiv[0];            
            dojo.empty(tasksDiv);
            var completedTasks = 0;
            rally.forEach(item.Tasks, function(task) {
                if (task.State === "Completed") {
                    completedTasks++;
                }
            });

            if (completedTasks === 0) {
                dojo.addClass(tasksDiv, "none");
            } else if (completedTasks < item.Tasks.length) {
                dojo.addClass(tasksDiv, "some");
            } else {
                dojo.addClass(tasksDiv, "all");
            }

            var tasksLink = new rally.sdk.ui.basic.Link({
                item: item,
                text: completedTasks + " of " +
                        item.Tasks.length + " tasks completed",
                subPage: "tasks"
            });
            tasksLink.display(tasksDiv);
        }

        var defectsDiv = dojo.query('.defects', card);

        if (defectsDiv.length > 0) {
            defectsDiv = defectsDiv[0];
            dojo.empty(defectsDiv);
            var closedDefects = 0;
            rally.forEach(item.Defects, function(defect) {
                if (defect.State === "Closed") {
                    closedDefects++;
                }
            });

            if (closedDefects === 0) {
                dojo.addClass(defectsDiv, "none");
            } else if (closedDefects < item.Defects.length) {
                dojo.addClass(defectsDiv, "some");
            } else {
                dojo.addClass(defectsDiv, "all");
            }

            var defectsLink = new rally.sdk.ui.basic.Link({
                item: item,
                text: closedDefects + " of " +
                        item.Defects.length + " defects closed",
                subPage: "defects"
            });
            defectsLink.display(defectsDiv);
        }

        if (options && options.filterBy) {
            that.applyFilter();
        }

        if (options && options.colorByArtifactType) {
            that.applyArtifactTypeStyle();
        }

        if (options && options.showAgeAfter && options.attribute && item.RevisionHistory) {
            var ageDiv = dojo.query('.age', card);

            var daysOld = that._getColumnAgeDays();

            if (ageDiv.length > 0 && daysOld > options.showAgeAfter) {
                ageDiv = ageDiv[0];
                dojo.empty(ageDiv);
                dojo.addClass(ageDiv, 'agedCard');

                var ageDisplay = (daysOld === 1) ? daysOld + " day" : daysOld + " days";
                var ageTextNode = document.createTextNode(ageDisplay + " in this column");
                ageDiv.appendChild(ageTextNode);
            }
        }

         //Run Due Date Logic        
        if (options && options.showSla && !options.attribute) {            
            that._getFullRallyItem(card);            
        }        
    };

    this.renderCard = function() {
        card = document.createElement("div");
        dojo.addClass(card, "card");

        var header = document.createElement("div");
        dojo.addClass(header, "cardHeader");
        dojo.addClass(header, "dojoDndHandle");
        card.appendChild(header);
        dojo.connect(header, "onclick", that._headerClicked);
        dojo.connect(header, "onmouseover", that._headerMouseOver);

        var idDiv = document.createElement("div");
        dojo.addClass(idDiv, "leftCardHeader");
        header.appendChild(idDiv);
        var ownerImg = document.createElement("img");
        dojo.addClass(ownerImg, "cardOwner");

        var ownerName = document.createElement("div");
        dojo.addClass(ownerName, "cardOwnerName");

        header.appendChild(ownerImg);
        header.appendChild(ownerName);

        cardContent = document.createElement("div");
        dojo.addClass(cardContent, "cardContent");
        card.appendChild(cardContent);

        var cardName = document.createElement("div");
        dojo.addClass(cardName, "cardName");
        cardContent.appendChild(cardName);

        var statusDiv = document.createElement("div");
        dojo.addClass(statusDiv, 'status');
        if (options && options.showTaskCompletion && item.Tasks && item.Tasks.length) {
            var tasksDiv = document.createElement("div");
            dojo.addClass(tasksDiv, "tasks");
            statusDiv.appendChild(tasksDiv);
        }
        
        if (options && options.showDefectStatus && item.Defects && item.Defects.length) {
            var defectsDiv = document.createElement("div");
            dojo.addClass(defectsDiv, "defects");
            statusDiv.appendChild(defectsDiv);
        }

        if (statusDiv.childNodes.length) {
            cardContent.appendChild(statusDiv);
        }

        if (options && options.showAgeAfter) {           
            var ageDiv = document.createElement('div');
            dojo.addClass(ageDiv, "age");
            cardContent.appendChild(ageDiv);
        }        

        that._populateCard(card);

        cardMenu = document.createElement("div");
        dojo.addClass(cardMenu, "cardMenu");
        card.appendChild(cardMenu);
        that._addReadyDivToMenu();
        that._addBlockedDivToMenu();
        that._addEditLinkToMenu();
        dojo.connect(cardContent, "onclick", that._contentClicked);

        return card;
    };

    this.renderDndCard = function() {
        var avatarCard = that.renderCard();
        dojo.addClass(avatarCard, "avatar");
        return avatarCard;
    };

    this.updateDisplay = function() {
        if (item.Ready) {
            dojo.addClass(card, "ready");
        }
        else {
            dojo.removeClass(card, "ready");
        }
        if (item.Blocked) {
            dojo.addClass(card, "blocked");
        }
        else {
            dojo.removeClass(card, "blocked");
        }
    };

    this._addReadyDivToMenu = function() {
        if (item.hasOwnProperty("Ready")) {
            var readyIndicator = document.createElement("div");
            dojo.addClass(readyIndicator, "readyIndicator");
            readyIndicator.onclick = function(e) {
                item.Ready = !item.Ready;
                that.updateDisplay();
                that.updateItem({_ref:item._ref,Ready:item.Ready}, function() {
                });
            };
            cardMenu.appendChild(readyIndicator);
        }
        that.updateDisplay();
    };
    this._addBlockedDivToMenu = function() {
        var blockedIndicator = document.createElement("div");
        dojo.addClass(blockedIndicator, "blockedIndicator");
        blockedIndicator.onclick = function(e) {
            item.Blocked = !item.Blocked;
            that.updateDisplay();
            that.updateItem({_ref:item._ref,Blocked:item.Blocked}, function() {
            });
        };
        cardMenu.appendChild(blockedIndicator);
        that.updateDisplay();
    };

    this._addEditLinkToMenu = function() {
        var editLinkContainer = document.createElement("div");
        dojo.addClass(editLinkContainer, "editLinkContainer");
        var editLink = new rally.sdk.ui.basic.EditLink({item: item});
        editLink.display(editLinkContainer);
        cardMenu.appendChild(editLinkContainer);
    };
};
