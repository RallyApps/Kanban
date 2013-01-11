describe("KanbanCardRenderer", function() {

  var cardRenderer;

  beforeEach(function() {
    spyOn(rally.sdk.ui.cardboard.BasicCardRenderer, "call").andCallFake(function() {
    });
    cardRenderer = new KanbanCardRenderer(null, null, null);
  });

  it("shall correctly check if a weekday is a work day", function() {
    var date = new Date(2012, 11, 26);
    expect(cardRenderer.isAWorkDay(date)).toBe(true);
  });

  it("shall correctly check if a weekend day is a work day", function() {
    var date = new Date(2012, 11, 30);
    expect(cardRenderer.isAWorkDay(date)).toBe(false);
  });

  it("shall correctly calculate SLA dates", function() {
    var dec25 = new Date(2012, 11, 25);
    var dec27 = new Date(2012, 11, 27);
    expect(cardRenderer.dateSlaDueDateMinusWeekends(dec25, -1).getTime()).toBe(dec25.getTime());
    expect(cardRenderer.dateSlaDueDateMinusWeekends(dec25, 0).getTime()).toBe(dec25.getTime());
    expect(cardRenderer.dateSlaDueDateMinusWeekends(dec25, 3).getTime()).toBe(dec27.getTime());
  });

  it("shall correctly calculate SLA dates (over weekends)", function() {
    var dec25 = new Date(2012, 11, 25);
    var jan1 = new Date(2013, 0, 1);
    expect(cardRenderer.dateSlaDueDateMinusWeekends(dec25, 6).getTime()).toBe(jan1.getTime());
  });

  it("shall correctly calculate the number of days between two dates", function() {
    var dec24 = new Date(2012, 11, 24);
    var dec25 = new Date(2012, 11, 25);
    var dec27 = new Date(2012, 11, 27);
    expect(cardRenderer.calcNumOfWrkDaysBetweenTwoDates(dec25, dec24)).toBe(1);
    expect(cardRenderer.calcNumOfWrkDaysBetweenTwoDates(dec25, dec25)).toBe(1);
    expect(cardRenderer.calcNumOfWrkDaysBetweenTwoDates(dec25, dec27)).toBe(3);
  });

  it("shall correctly calculate the number of days between two dates (over weekends)", function() {
    var dec25 = new Date(2012, 11, 25);
    var jan1 = new Date(2013, 0, 1);
    expect(cardRenderer.calcNumOfWrkDaysBetweenTwoDates(dec25, jan1)).toBe(6);
  });

});