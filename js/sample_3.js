var coverage_url = "https://gds.eligibleapi.com/v1.3/coverage/all.json"

$(document).ready(function () {
  // Shows the test form or real form depending on the value of radio button named test
  var drawForm = function () {
    if ($("input[name=test]:checked").val() == "true") {
      showTestForm();
    } else {
      showRealForm();
    }
  }

  // Whenever the user click on the radio button for test, show test or real form
  $("input[name=test]").on('click', drawForm);

  // Draw the form according to the test selection
  drawForm();

  // When the user clicks on submit, do an api request to eligible api and parse the answer
  $(".form-coverage").on('submit', function (e) {
    e.preventDefault();

    // Remove any previous result
    $(".eligible-result").remove();

    // Do the api request and parse the results
    fetchCoverage();
  });
});

// Shows the real api call form
showRealForm = function () {
  $(".test-param").hide();
  $(".real-param").show();
}

// Shows the test api call form
showTestForm = function () {
  $(".real-param").hide();
  $(".test-param").show();
}

var fetchCoverage = function () {
  // Put all the form fields into an object
  var params = {
    api_key: $("#api_key").val(),
    payer_id: $("#payer_id").val(),
    provider_npi: $("#provider_npi").val(),
    provider_last_name: $("#provider_last_name").val(),
    provider_first_name: $("#provider_first_name").val(),
    member_id: $("#member_id").val(),
    member_first_name: $("#member_first_name").val(),
    member_last_name: $("#member_last_name").val(),
    member_dob: $("#member_dob").val(),
    test: $("#test").val() || "false"
  };

  // Validation, if any parameter is missing, add the bootstrap class has-error
  $.each(params, function (key) {
    if ((params[key] === undefined) || (params[key].match(/^\s*$/))) {
      $("#" + key).closest('.form-group').addClass('has-error');
    } else {
      $("#" + key).closest('.form-group').removeClass('has-error');
    }
  });

  // If there is any error, alert, otherwise, do the request
  if ($(".has-error").length > 0) {
    alert("Please fill all the fields");
  } else {
    $(".has-error").removeClass("has-error");
    coverageRequest(params);
  }
}

// Perform the api request
var coverageRequest = function (params) {
  var coverageRequest = new EligibleRequest(EligibleEndpoints.coverage, successCallback, errorCallback, true);
  coverageRequest.request(params);
}

// If there is an error with the ajax api request, show it on an alert box
var errorCallback = function (xhr, textStatus, errorThrown) {
  // Check for NPI on errorThrown, since it may be an enrollment issue (https://eligibleapi.com/rest#enrollments)
  if (typeof(errorThrown) === "String" && errorThrown.indexOf("NPI")) {
    alert("You should enroll your NPI though our website");
  } else {
    window.alert("Error on request: " + errorThrown);
  }
}

// If the api call was done, process its response, this just either build the success api call, or the error related
var successCallback = function (data) {
  var coverage = new Coverage(data);

  if (coverage.hasError()) {
    buildError(coverage.parseError());
  } else {
    buildCoverageHTML(coverage);
  }
}

// When there is an error on the api response, like the insurance company is down for maiteinance, we get an error
// which could be retrieved by coverage.parseError()
buildError = function (error) {
  var coverageSection = $("<section/>").addClass("coverage-section");
  var h1 = $("<h1/>", {text: error['reject_reason_description']}).appendTo(coverageSection);
  var body = $('body');
  coverageSection.appendTo(body);
}

// When the api call was ok and we get data from the patient, build the success form
buildCoverageHTML = function (coverage) {
  var container = $("<section/>").addClass("coverage-section");
  var additionalInsuranceSection;
  var insuranceSection = $("<section/>").addClass("insurance-section");

  var plugin = new CoveragePlugin(coverage, container);


  plugin.addDemographicsSection();
  plugin.addInsuranceSection1(insuranceSection);
  plugin.addInsuranceSection2(insuranceSection);
  plugin.addInsuranceSection3(insuranceSection);

  // We build a bootstrap tab to display the services and plan financial all together
  var financials = $("<ul/>").addClass("nav nav-tabs");
  var deductibles_tab = $("<li/>").addClass("active").appendTo(financials);
  deductibles_tab.append($("<a/>", {href: "#deductibles", text: "Deductibles"}));
  var maximums_tab = $("<li/>").appendTo(financials);
  maximums_tab.append($("<a/>", {href: "#maximums", text: "Maximums"}));
  var coinsurance_tab = $("<li/>").appendTo(financials);
  coinsurance_tab.append($("<a/>", {href: "#coinsurance", text: "Coinsurance"}));
  var copayment_tab = $("<li/>").appendTo(financials);
  copayment_tab.append($("<a/>", {href: "#copayment", text: "Copayment"}));
  var authorizations_tab = $("<li/>").appendTo(financials);
  authorizations_tab.append($("<a/>", {href: "#authorizations", text: "Authorizations"}));

  var tab_content = $("<div/>").addClass("tab-content");
  var deductibles = $("<div/>", {id: "deductibles"}).addClass("tab-pane active").appendTo(tab_content);
  var maximums = $("<div/>", {id: "maximums"}).addClass("tab-pane active").appendTo(tab_content);
  var coinsurance = $("<div/>", {id: "coinsurance"}).addClass("tab-pane active").appendTo(tab_content);
  var copayment = $("<div/>", {id: "copayment"}).addClass("tab-pane active").appendTo(tab_content);
  var authorizations = $("<div/>", {id: "authorizations"}).addClass("tab-pane active").appendTo(tab_content);

  plugin.addDeductibles(deductibles);
  plugin.addMaximumMinimum(maximums);
  plugin.addCoinsurance(coinsurance);
  plugin.addCopayment(copayment);
  //plugin.addAuthorizations(authorizations);

  // Append the financials to the container
  var tab = $("<div/>").addClass("financials_tab").append(financials).append(tab_content);
  container.append('<div class="clearfix">&nbsp;</div>').append(tab);

  plugin.addDisclaimer();
  plugin.addAdditionalInsurancePolicies();

  var body = $('body');
  var subscriberSection = $("<section/>").addClass('subscriber-section');
  container.appendTo(body);
  subscriberSection.prependTo(container);
  insuranceSection.insertAfter(subscriberSection);

  // Adding classes for styling
  $('.patient').appendTo(subscriberSection);
  $('.dependent').appendTo(subscriberSection);
  $('.primary-insurance').appendTo(insuranceSection);

  // If there is any additional insurance policy, add links to it
  var insuranceLinks = plugin.getAdditionalInsuranceLinks();
  if (insuranceLinks.length > 0) {
    var additionalInsuranceSection = $("<section/>").
      addClass('additional-insurance-section').addClass("alert alert-warning fade in").
      append('<p>Other insurance policies were found. Click below to see details</p>');
    $.each(insuranceLinks, function (idx, link) {
      additionalInsuranceSection.append(link);
      additionalInsuranceSection.append($("<br/>"));
    });
    additionalInsuranceSection.appendTo(subscriberSection);
  }

  $('body').append(plugin.coverageSection);


  // Attach the events for the financials tab
  $(".nav-tabs li a").click(function(e) {
    e.preventDefault();
    $(this).tab('show');
  });
  $(".nav-tabs li:first a").tab('show');
}
