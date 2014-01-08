$(document).ready(function () {
  // Shows the test form or real form depending on the value of radio button named test
  var drawForm = function (e) {
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
  if ($("input[name=test]:checked").val() == "true") {
    var params = {
      api_key: $("#api_key").val(),
      member_id: $("#test_member_id").val(),
      provider_npi: "1234567890",
      test: "true"
    }
  } else {
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
      test: "false"
    }
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
  if ($("input[name=test]:checked").val() != "true" && $(".has-error").length > 0) {
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
  } else if (typeof(errorThrown) === "String" && errorThrown.indexOf("Payer id submitted is not supported")) {
     alert(errorThrown);
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
  $(".coverage-section").remove();
  var coverageSection = $("<section/>").addClass("coverage-section");
  if (error['details'].indexOf("Payer id submitted") !== -1) {
    var h1 = $("<h1/>", {text: error['details']}).appendTo(coverageSection);
  } else {
    var h1 = $("<h1/>", {text: error['reject_reason_description']}).appendTo(coverageSection);
  }
  var body = $('body');
  coverageSection.appendTo(body);
}

// When the api call was ok and we get data from the patient, build the success form
buildCoverageHTML = function(coverage) {
  $(".coverage-section").remove();

  var plugin = new CoveragePlugin(coverage);

  // Adds the demographic section
  plugin.addDemographicsSection();
  plugin.addInsuranceSection1();
  plugin.addInsuranceSection2();
  plugin.addInsuranceSection3();
  plugin.addPlanMaximumMinimumDeductibles();
  plugin.addPlanCoinsurance();
  plugin.addPlanCopayment();
  plugin.addPlanDisclaimer();
  plugin.addAdditionalInsurancePolicies();
  plugin.addGenericServices();

  $('body').append(plugin.coverageSection);
}
