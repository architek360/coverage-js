$(document).ready(function () {
  var data = $.parseJSON($("#jsonAnswer").html());
  var coverage = new Coverage(data);
  buildCoverageHTML(coverage);
});

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
