var KanbanColumnRenderer = function(board, value, options) {
    rally.sdk.ui.cardboard.BasicColumnRenderer.call(this, board, value, options);
    var that = this;
    var dndContainer;
    var cards = 0;
    var columnDiv;
    var capacity = Infinity;
    var resourcesDisplay;
    var saveLinkHandler, cancelLinkHandler;
    var columnHeader, columnPolicy, policyHeaderDiv, policySubheaderDiv, policyTextboxDiv, policyTextArea, policyTextAreaExtension, editPolicyDiv;
    var editPolicyElements;
    var editPolicyHandlers = [];

    var kanbanPolicy = new KanbanPolicy(board.getRallyDataSource(), function(updatedVal) {
        if (updatedVal !== null) {
            options.policy = updatedVal;
        }
        that.updateColumn();
    });

    this.updateColumn = function() {
        if (saveLinkHandler) {
            dojo.disconnect(saveLinkHandler);
        }
        if (cancelLinkHandler) {
            dojo.disconnect(cancelLinkHandler);
        }
        that._populateColumn();
    };

    this.render = function() {

        columnDiv = document.createElement('div');
        dojo.addClass(columnDiv, 'column');

        columnHeader = document.createElement('div');
        dojo.addClass(columnHeader, 'columnHeader');

        if (options && options.wipLimit) {
            capacity = options.wipLimit;
            resourcesDisplay = document.createElement('div');
            dojo.addClass(resourcesDisplay, 'capacityDisplay');
            columnHeader.appendChild(resourcesDisplay);
        }
        columnDiv.appendChild(columnHeader);

        columnPolicy = document.createElement('div');
        dojo.addClass(columnPolicy, 'columnPolicy hidePolicy');
        columnDiv.appendChild(columnPolicy);

        policyHeaderDiv = document.createElement('div');
        dojo.addClass(policyHeaderDiv, 'policyHeaderDiv');
        columnPolicy.appendChild(policyHeaderDiv);

        policySubheaderDiv = document.createElement('div');
        dojo.addClass(policySubheaderDiv, 'policySubheaderDiv');
        columnPolicy.appendChild(policySubheaderDiv);

        policyTextboxDiv = document.createElement('div');
        dojo.addClass(policyTextboxDiv, 'policyTextboxDiv');
        policyTextArea = dojo.create('textarea');
        policyTextboxDiv.appendChild(policyTextArea);
        policyTextAreaExtension = new dijit.form.Textarea({ maxLength: 256 }, policyTextArea);
        columnPolicy.appendChild(policyTextboxDiv);

        editPolicyDiv = document.createElement('div');
        dojo.addClass(editPolicyDiv, 'editPolicyDiv');
        columnPolicy.appendChild(editPolicyDiv);

        dndContainer = document.createElement('div');
        dojo.addClass(dndContainer, 'columnContent');
        columnDiv.appendChild(dndContainer);
        this._populateColumn();

        return columnDiv;
    };

    this._populateColumn = function() {
        columnHeader.innerHTML = options.displayValue || value || "-- No Entry --";

        if (options && options.wipLimit) {
            setCapacityText();
            columnHeader.appendChild(resourcesDisplay);
        }

        policyHeaderDiv.innerHTML = 'Exit Policy';
        policySubheaderDiv.innerHTML = 'What needs to be done before an item is ready to leave this column?';

        var textArea = dojo.query('.policyTextboxDiv textarea', columnDiv)[0];
        dojo.style(textArea, 'border', '1px solid transparent');
        dojo.attr(textArea, 'readOnly', true);
        if (options && options.hasOwnProperty('policy')) {
            if (options.policy === "") {
                policyTextAreaExtension.setValue(options.policy + '\n');
            } else {
                policyTextAreaExtension.setValue(options.policy);
            }
        }

        if (options && options.showPolicy) {
            dojo.removeClass(columnPolicy, 'hidePolicy');
        }

        editPolicyElements = [columnPolicy, policyHeaderDiv, policySubheaderDiv, textArea];
        rally.forEach(editPolicyElements, dojo.hitch(this, function(element) {
            editPolicyHandlers.push(dojo.connect(element, 'onmouseenter', this, this._editCursor));
        }));
    };

    this._editCursor = function(evt) {
        var srcElement = evt.srcElement || evt.target;

        if (dojo.isIE <= 8) {
            dojo.style(srcElement, 'cursor', 'pointer');
        } else {
            dojo.style(srcElement, 'cursor', 'url("/apps/images/editIcon.cur"), url("/apps/images/editIcon.png"), pointer');
        }
        editPolicyHandlers.push(dojo.connect(srcElement, 'onclick', this, this._editPolicy));
    };

    this._savePolicy = function() {
        dojo.empty(editPolicyDiv);
        dojo.style(policySubheaderDiv, 'display', 'none');
        dojo.removeClass(editPolicyDiv, 'editPolicyDivExtraPadding');
        kanbanPolicy.savePolicy(value, policyTextAreaExtension.getValue());
    };

    this._cancelPolicy = function(evt) {
        evt.preventDefault();
        dojo.empty(editPolicyDiv);
        dojo.style(policySubheaderDiv, 'display', 'none');
        dojo.removeClass(editPolicyDiv, 'editPolicyDivExtraPadding');
        that.updateColumn();
    };

    this._formatTextArea = function() {
        var textarea = dojo.query('.policyTextboxDiv textarea', columnDiv)[0];

        rally.forEach(editPolicyHandlers, function(handler) {
            dojo.disconnect(handler);
        });
        editPolicyHandlers = [];

        rally.forEach(editPolicyElements, function(element) {
            element.style.cursor = 'default';
        });
        editPolicyElements = null;

        dojo.style(textarea, 'border', '1px solid #c6c6c6');
        dojo.attr(textarea, 'readOnly', false);

        dojo.addClass(editPolicyDiv, 'editPolicyDivExtraPadding');
        policyTextAreaExtension.focus();
    };

    this._showPolicyInstructions = function() {
        dojo.style(policySubheaderDiv, 'display', 'block');
    };

    this._createSaveButton = function(element) {
        var saveButtonSpan = document.createElement('span');
        dojo.addClass(saveButtonSpan, 'saveButtonSpan');
        element.appendChild(saveButtonSpan);

        var saveButton = new rally.sdk.ui.basic.Button({text: 'Save'});
        saveButton.addEventListener('onClick', dojo.hitch(this, this._savePolicy));
        saveButton.display(saveButtonSpan);
    };

    this._createCancelLink = function(element) {
        var cancelLink = dojo.create('a', {href: '#', innerHTML: 'Cancel'}, element);
        cancelLinkHandler = dojo.connect(cancelLink, 'onclick', this, this._cancelPolicy);
    };

    this._editPolicy = function() {
        this._formatTextArea();
        this._showPolicyInstructions();

        dojo.empty(editPolicyDiv);
        this._createSaveButton(editPolicyDiv);
        this._createCancelLink(editPolicyDiv);
    };

    function setCapacityText() {
        if (options && options.wipLimit) {
            dojo.empty(resourcesDisplay);
            resourcesDisplay.innerHTML = getCapacityText(cards, capacity);
            if (capacity >= cards) {
                dojo.removeClass(columnDiv, 'overCapacity');
            } else {
                dojo.addClass(columnDiv, 'overCapacity');
            }
        }
    }

    function getCapacityText(cards, wip) {
        if (wip === Infinity || wip === "Infinity") {
            return " (" + cards + '/<span class="infinitySymbol">&#8734;</span>)';
        }
        else {
            return " (" + cards + "/" + wip + ")";
        }
    }

    this.addNoDropClass = function(nodes) {
        if (capacity === Infinity) {
            return false;
        }
        return capacity <= cards;
    };

    this.cardRemoved = function(card) {
        cards--;
        setCapacityText();
    };

    this.cardAdded = function(card) {
        cards++;
        setCapacityText();
    };

    this.getDndContainer = function() {
        return dndContainer;
    };

    this.getColumnNode = function() {
        return columnDiv;
    };

    this.clear = function() {
        dojo.empty(that.getDndContainer());
        cards = 0;
        setCapacityText();
    };
};