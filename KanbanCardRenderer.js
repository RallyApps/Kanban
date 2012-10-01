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
