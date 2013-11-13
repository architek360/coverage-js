"use strict";

// Endpoints object for eligible
var EligibleEndpoints = {
  coverage: "https://gds.eligibleapi.com/v1.3/coverage/all.json",
  demographics: "https://gds.eligibleapi.com/v1.3/demographics/all.json"
}


// Generic object to make requests to eligible api
function EligibleRequest(endpoint, successCallback, errorCallback, debug) {
  this.endpoint = endpoint;
  this.successCallback = successCallback;
  this.errorCallback = errorCallback;
  this.debug = debug;


  // Converts a json object to a query string for http
  this.objectToUrlParameters = function (obj) {
    var parameters = new Array();
    for (var key in obj) {
      parameters.push(key + "=" + encodeURIComponent(obj[key]));
    }
    return parameters.join("&");
  }

  // Do an api request to eligible
  this.request = function (params) {
    this.parameters = this.objectToUrlParameters(params);

    this.options = {
      data: this.parameters,
      headers: {
        Accept: "application/json"
      },
      type: "GET",
      dataType: "text",
      processData: false,
      success: function (data, textStatus, jqXHR) {
        if (this.debug)
          console.log("GET Ajax Call SUCCESS URL:" + thid.endpoint + "?" + parameters + ", Status :" + textStatus)

        try {
          var jsonData = $.parseJSON(data);
        } catch (err) {
          if (this.debug)
            console.log(err);
          errorCallback(null, null, err);
        }
        if (jsonData)
          successCallback(jsonData);
      },
      error: function (xhr, textStatus, errorThrown) {
        if (this.debug)
          console.log("GET Ajax Call FAILURE URL:" + this.endpoint + "?" + parameters + ", Status :", textStatus, ", Error: ", errorThrown);
        errorCallback(xhr, textStatus, errorThrown);
      }
    };

    $.ajax(this.endpoint, this.options);
  }
}

// This is a generic object used by different plugins for drawing the coverage answer
function Coverage(json) {
  this.json = json;

  // Check if the coverage answer has any errors on it
  this.hasError = function () {
    return(this.json.error != undefined);
  }

  // Parses the errors on the coverage answer
  this.parseError = function () {
    if (this.hasError())
      return(this.error);
    else
      return(null);
  }

  // Check if the coverage answer has demographic information
  this.hasDemographics = function () {
    return (this.json['demographics'] && (this.json['demographics']['dependent'] || this.json['demographics']['susbscriber']))
  }

  // Gets the demographics part of the answer
  this.getDemographics = function () {
    if (!this.hasDemographics()) return null;
    return(this.json['demographics']);
  }

  // Check if the coverage answer has a subscriber
  this.hasSubscriber = function () {
    return (this.json['demographics'] && this.json['demographics']['subscriber']);
  }

  // Return the subscriber part of the answer
  this.getSubscriber = function () {
    if (!this.hasSubscriber()) return null;
    return (this.json['demographics']['subscriber']);
  }

  // Return the patient for the coverage answer
  this.getPatient = function () {
    if (!this.hasDemographics()) return null;

    if (this.json['demographics']['dependent'] && this.json['demographics']['dependent']['first_name']) {
      return(this.json['demographics']['dependent']);
    } else if (this.json['demographics']['subscriber'] && this.json['demographics']['subscriber']['first_name']) {
      return(this.json['demographics']['subscriber']);
    } else {
      return(null);
    }
  }

  // Check if the coverage answer has insurance information
  this.hasInsurance = function () {
    return(this.json['insurance'] && this.json['insurance']['name']);
  }

  // Return the insurance for the coverage answer
  this.getInsurance = function () {
    if (!this.hasInsurance()) return null;
    return(this.json['insurance']);
  }

  // Check if the coverage answer has plan information
  this.hasPlan = function () {
    return(this.json['plan'] && this.json['plan']['coverage_status_label']);
  }

  // Return the plan for the coverage answer
  this.getPlan = function () {
    if (!this.hasPlan()) return null;
    return(this.json['plan']);
  }

  // Check if the plan has financials information
  this.hasPlanFinancials = function() {
    if (!this.hasPlan()) return false;
    return(this.json['plan']['financials'] && this.json['plan']['financials']['deductible']);
  }

  // Return the financials for the plan
  this.getPlanFinancials = function() {
    if (!this.hasPlanFinancials()) return null;
    return(this.json['plan']['financials']);
  }

  // Check if the plan has additional insurance policies
  this.hasAdditionalInsurancePolicies = function() {
    if (!this.hasPlan()) return false;
    return(this.json['plan']['additional_insurance_policies']);
  }

  // Return the additional insurance policies for the plan
  this.getAdditionalInsurancePolicies = function() {
    if (!this.hasAdditionalInsurancePolicies()) return null;
    return(this.json['plan']['additional_insurance_policies']);
  }

  // Check if the coverage answer has a services section
  this.hasServices = function() {
    return(this.json['services'] && this.json['services'].length > 0);
  }

  // Return the services for the coverage answer
  this.getServices = function() {
    if (!this.hasAdditionalInsurancePolicies()) return null;
    return(this.json['services']);
  }


  ///////////////////////////////////
  // Utility parsing functions below
  ///////////////////////////////////

  // Returns subscriber information within an Array
  this.parseSubscriberInfo = function (subscriber) {
    var data = new Array();
    if (subscriber['member_id'].length > 0)
      data.push("Member ID: " + subscriber['member_id']);
    if (subscriber['dob'].length > 0)
      data.push("DOB: " + subscriber['dob']);
    if (subscriber['group_id'].length > 0)
      data.push("Group ID: " + subscriber['group_id']);
    if (subscriber['group_name'].length > 0)
      data.push("Group Name: " + subscriber['group_name']);
    data = data.concat(this.parseNameAndAddress(subscriber));
    return(data);
  }

  // Parses contact details for an eligible contact
  this.parseContactDetails = function (contactDetails) {
    var list = new Array();
    $.each(contactDetails, function (index, details) {
      var detailsList = new Array();
      if ((details['first_name'] && details['first_name'].length > 0) || (details['last_name'] && details['last_name'].length > 0)) {
        detailsList.push(this.parseName(details));
      }
      if (details['address'] && details['address']['street_line_1'] && details['address']['street_line_1'].length > 0) {
        detailsList.push(this.parseAddress(details['address']));
      }
      if (details['identification_type'] && details['identification_type'].length > 0) {
        detailsList.push(details['identification_type'] + ': ' + details['identification_code']);
      }
      if (details['contacts'] && details['contacts'].length > 0) {
        detailsList.push(this.parseContacts(details['contacts']));
      }
      list.push(detailsList);
    });
    return(list);
  };

  // Parse eligible contacts
  this.parseContacts = function (contactData) {
    var contacts = new Array();

    $.each(contactData, function (index, contact) {
      contacts.push(capitalise(contact.contact_type) + ": " + contact.contact_value);
    });

    return contacts;
  };



  // Parse a person name and address from the demographics information
  this.parseNameAndAddress = function (person) {
    var result = new Array();

    result.push(this.parseName(person));
    if (person['address']) {
      result = result.concat(this.parseAddress(person['address']));
    }

    return(result);
  }

  // Parse the name from the keys first_name and last_name
  this.parseName = function (data) {
    var firstName = data['first_name'];
    var lastName = data['last_name'];

    if (this.isPresent(firstName) && this.isPresent(lastName)) {
      return(firstName + " " + lastName);
    } else if (this.isPresent(firstName)) {
      return(firstName);
    } else if (this.isPresent(lastName)) {
      return(lastName);
    } else {
      return "";
    }
  }

  // Parse the address as retrieved from Eligible
  this.parseAddress = function (addressData) {
    var list = new Array();

    if (addressData['street_line_1'] && addressData['street_line_1'].length > 0) {
      list.push(addressData['street_line_1']);
      if (addressData['street_line_2'] && addressData['street_line_2'].length > 0) {
        list.push(addressData['street_line_2']);
      }
    }

    if (addressData['city']) {
      if (addressData['city'] == addressData['state']) {
        list.push(addressData['state'] + ", " + addressData['zip']);
      } else {
        list.push(addressData['city'] + ", " + addressData['state'] + ", " + addressData['zip']);
      }
    }

    return(list);
  }

  // Parse the gender of a person retrieved from the demographics
  this.parseGender = function (gender) {
    if (gender == 'F') {
      return "Female";
    } else if (gender == 'M') {
      return "Male";
    } else {
      return '';
    }
  }

  // Parses the comments that can be found on different parts of the json response, and returns them as an array
  this.parseComments = function (comments) {
    var list = new Array();

    if (comments) {
      $.each(comments, function (index, comment) {
        list.push(comment);
      });
    }

    return(list);
  }

  // Parse eligible dates
  this.parseDates = function (dates) {
    var list = new Array();

    $.each(dates, function (index, current) {
      list.push(current.date_type + ": " + current.date_value);
    });

    return(list);
  };

  // Parses the dates that could have the format _begin, _end or just the date type
  this.parseSpecificDates = function (dates, type) {
    var start;
    var end;
    $.each(dates, function (index, date) {
      if (date.date_type == type || date.date_type == type + "_begin") {
        start = date.date_value;
      } else if (date.date_type == type + "_end") {
        end = date.date_value;
      }
    });
    return(this.formatDates(start, end));
  }

  // Format two dates in a single string
  this.formatDates = function (start, end) {
    if ((start == undefined || start == "") && (end == undefined || end == "")) {
      return "";
    } else if (start == undefined || start == "") {
      return end;
    } else if (end == undefined || end == "") {
      return start;
    } else {
      return start + " to " + end;
    }
  }

  // Check the keys in info, if its amount, it returns the money amount, if it has the key percent, it returns the
  // percent format
  this.parseFinancialAmount = function (info) {
    var amount = null;
    if (info['amount'] && info['amount'].length > 0)
      amount = this.parseAmount(info['amount']);
    else if (info['percent'] && info['percent'].length > 0)
      amount = "% " + info['percent'];
    return amount;
  }

  // Parses an amount by returning decimals if there is not period on the string
  this.parseAmount = function (amount) {
    if (amount.indexOf(".")) {
      return("$ " + amount);
    } else {
      return("$ " + amount + ".00");
    }
  }

  // Parses a reference label and reference number from eligible answer
  this.parseReference = function (reference) {
    var result = new Array();

    $.each(reference, function (index, current) {
      result.push(current.reference_label + ": " + current.reference_number);
    });

    return result;
  };

  // Returns Active or Inactive based on the coverage status
  this.coverageStatus = function (data) {
    if (data.coverage_status == "1" || data.coverage_status == "2" || data.coverage_status == "3" || data.coverage_status == "4" || data.coverage_status == "5") {
      return("Active");
    } else {
      return("Inactive");
    }
  };

  // Checks if there is a value on the variable
  this.isPresent = function (object) {
    if (object == undefined || object == null || object == "") {
      return false;
    } else {
      return true;
    }
  }
}

function CoveragePlugin(coverage, coverageSection) {
  this.coverage = coverage;
  this.coverageSection = coverageSection || $("<section/>").addClass("coverage-section");
  var that = this;

  // Builds a twitter bootstrap panel, with the title and content provided
  this.buildPanelUI = function (title, content) {
    var panel = $('<div class="panel panel-default">');
    panel.append($('<div class="panel-heading"><h4>' + title + '</h4></div>'));
    var contentPanel = $('<div class="panel-body"></div>');
    contentPanel.append(content);
    panel.append(contentPanel);

    panel.addClass(title.replace(/ /g, '-').toLowerCase());
    return panel;
  }

  // Add a demographics section
  this.addDemographicsSection = function () {
    if (that.coverage.hasDemographics()) {
      that.coverageSection.append(
        that.buildPanelUI('Patient',
          that.buildDemographics(that.coverage.getPatient())));
    }
  }

  // Add insurance section part 1
  this.addInsuranceSection1 = function () {
    if (that.coverage.hasInsurance() && that.coverage.hasDemographics()) {
      that.coverageSection.append(
        that.buildPanelUI('Insurance',
          that.buildInsuranceSection1(that.coverage.getInsurance(), that.coverage.getDemographics())));
    }
  }

  // Add insurance section part 2
  this.addInsuranceSection2 = function () {
    if (that.coverage.hasPlan()) {
      that.coverageSection.append(
        that.buildPanelUI('Plan',
          that.buildInsuranceSection2(that.coverage.getPlan())));
    }
  }

  // Add insurance section part 3
  this.addInsuranceSection3 = function () {
    if (that.coverage.hasPlan() && that.coverage.hasSubscriber()) {
      that.coverageSection.append(
        that.buildPanelUI('Plan',
          that.buildInsuranceSection3(that.coverage.getPlan(), that.coverage.getSubscriber())));
    }
  }

  // Add maximum, minimum and deductibles table
  this.addMaximumMinimumDeductibles = function() {
    if (that.coverage.hasPlanFinancials()) {
      that.coverageSection.append(
        that.buildPanelUI('Plan Maximums and Deductibles',
          that.buildMaximumMinimumDeductibles(that.coverage.getPlanFinancials())));
    }
  }

  // Add coinsurance
  this.addCoinsurance = function() {
    if (that.coverage.hasPlanFinancials()) {
      that.coverageSection.append(
        that.buildPanelUI('Coinsurance',
          that.buildCoinsurance(that.coverage.getPlanFinancials()['coinsurance']))
      );
    }
  }

  // Add copayment
  this.addCopayment = function() {
    if (that.coverage.hasPlanFinancials()) {
      that.coverageSection.append(
        that.buildPanelUI('Copayment',
          that.buildCopayment(that.coverage.getPlanFinancials()['copayment']))
      );
    }
  }

  // Add disclaimer
  this.addDisclaimer = function() {
    if (that.coverage.hasPlanFinancials()) {
      that.coverageSection.append(
        that.buildPanelUI('Disclaimer',
          that.buildDisclaimer(that.coverage.getPlanFinancials()['disclaimer']))
      );
    }
  }

  // Add additional insurance companies
  this.addAdditionalInsurancePolicies = function() {
    if (that.coverage.hasAdditionalInsurancePolicies()) {
      that.coverageSection.append(
        that.buildPanelUI('Additional Insurance Policies',
          that.buildAdditionalInsurancePolicies(that.coverage.getAdditionalInsurancePolicies()))
      );
    }
  }

  // Add all the services with generic table format
  this.addGenericServices = function(columns) {
    if (columns == null) columns = 2;

    var master_div = $("<div/>");
    var div = $("<div/>").addClass("clearfix").addClass("services-div").appendTo(master_div);

    if (that.coverage.hasServices()) {
      var services = this.coverage.getServices();
      $.each(services, function (idx, service) {
        if (that.coverage.coverageStatus(service) == "Active") {
          if (div.children().length == columns) {
            div = $("<div/>").addClass("clearfix").addClass("services-div").appendTo(master_div);
          }
          if (service['financials'] && service['financials']['coinsurance']) {
            div.append(that.buildPanelUI(service['type_label'], that.buildGenericFinancials(service['financials'])));
          }
          if (service['facility'] && service['facility']['coinsurance']) {
            div.append(that.buildPanelUI(service['type_label'], that.buildGenericFinancials(service['facility'])));
          }
        }
      });
    }

    that.coverageSection.append(master_div);
  }

  // Build the demographics section
  this.buildDemographics = function (person) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr></tr>").appendTo(tableBody);

    $("<th/>", {text: "Name / Address"}).appendTo(rowHead);
    $("<td/>", {html: that.coverage.parseNameAndAddress(person).join("<br/>")}).appendTo(row);

    $("<th/>", {text: "Date of Birth"}).appendTo(rowHead);
    $("<td/>", {text: person['dob']}).appendTo(row);

    $("<th/>", {text: "Gender"}).appendTo(rowHead);
    $("<td/>", {text: that.coverage.parseGender(person['gender'])}).appendTo(row);

    return(table);
  }

  // Build Insurance Section part 1
  this.buildInsuranceSection1 = function (insurance, demographics) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr></tr>").appendTo(tableBody);

    $("<th/>", {text: "Name"}).appendTo(rowHead);
    $("<td/>", {text: insurance['name']}).appendTo(row);

    $("<th/>", {text: "Insurance Type"}).appendTo(rowHead);
    $("<td/>", {text: insurance['payer_type_label']}).appendTo(row);

    $("<th/>", {text: "Member Type"}).appendTo(rowHead);
    if (demographics['dependent'] && demographics['dependent']['first_name']) {
      $("<td/>", {text: "Dependent"}).appendTo(row);
    } else if (demographics['subscriber'] && demographics['subscriber']['first_name']) {
      $("<td/>", {text: "Subscriber"}).appendTo(row);
    } else {
      $("<td/>", {text: ""}).appendTo(row);
    }

    $("<th/>", {text: "ID"}).appendTo(rowHead);
    if (demographics['dependent'] && demographics['dependent']['member_id'] && demographics['dependent']['member_id'].length > 0)
      $("<td/>", {text: demographics['dependent']['member_id']}).appendTo(row);
    else if (demographics['subscriber'] && demographics['subscriber']['member_id'] && demographics['subscriber']['member_id'].length > 0)
      $("<td/>", {text: demographics['subscriber']['member_id']}).appendTo(row);
    else
      $("<td/>", {text: ''}).appendTo(row);

    return(table);
  }

  // Build Insurance Section part 2
  this.buildInsuranceSection2 = function (plan) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr></tr>").appendTo(tableBody).addClass("warning");

    $("<th/>", {text: "Coverage"}).appendTo(rowHead);
    $("<td/>", {text: plan['coverage_status_label']}).addClass("coverage-status-text").appendTo(row);

    $("<th/>", {text: "Type"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_type_label']}).appendTo(row);

    $("<th/>", {text: "Plan Name"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_name']}).appendTo(row);

    $("<th/>", {text: "Plan Number"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_number']}).appendTo(row);

    $("<th/>", {text: "Additional Information"}).appendTo(rowHead);
    $("<td/>", {html: that.coverage.parseComments(plan['comments']).join("<br/>")}).appendTo(row);

    return(table);
  }

  // Build Insurance Section part 3
  this.buildInsuranceSection3 = function (plan, subscriber) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr></tr>").appendTo(tableBody);

    $("<th/>", {text: "Group ID"}).appendTo(rowHead);
    $("<td/>", {text: subscriber['group_id']}).appendTo(row);

    $("<th/>", {text: "Group Name"}).appendTo(rowHead);
    $("<td/>", {text: subscriber['group_name']}).appendTo(row);

    $("<th/>", {text: "Dates"}).appendTo(rowHead);

    var dates = new Array();
    if (plan['dates']) {
      var eligibleDates = that.coverage.parseSpecificDates(plan['dates'], "eligibilty");
      var planDates = that.coverage.parseSpecificDates(plan['dates'], "plan");
      var serviceDates = that.coverage.parseSpecificDates(plan['dates'], "service");
      var policyDates = that.coverage.parseSpecificDates(plan['dates'], "policy_effective");

      if (eligibleDates && eligibleDates.length > 0) {
        dates.push("Eligible: " + eligibleDates);
      }

      if (planDates && planDates.length > 0) {
        dates.push("Plan: " + planDates);
      }

      if (serviceDates && serviceDates.length > 0) {
        dates.push("Service: " + serviceDates);
      }

      if (policyDates && policyDates.length > 0) {
        dates.push("Policy Effective: " + serviceDates);
      }
    }
    $("<td/>", {html: dates.join("<br/>")}).appendTo(row);

    $("<th/>", {text: "Subscriber Info"}).appendTo(rowHead);
    $("<td/>", {html: that.coverage.parseSubscriberInfo(subscriber).join("<br/>")}).appendTo(row);

    return(table);
  }

  // Build Additional Insurance Policies
  this.buildAdditionalInsurancePolicies = function (additionalPolicies) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);

    $("<th/>", {text: "Insurance Type"}).appendTo(rowHead);
    $("<th/>", {text: "Coverage Description"}).appendTo(rowHead);
    $("<th/>", {text: "References"}).appendTo(rowHead);
    $("<th/>", {text: "Contact Details"}).appendTo(rowHead);
    $("<th/>", {text: "Dates"}).appendTo(rowHead);
    $("<th/>", {text: "Comments"}).appendTo(rowHead);

    $.each(additionalPolicies, function (index, policy) {
      var row = $("<tr/>", {id: "insurance-" + index}).appendTo(tableBody);

      var insurance_types = new Array();
      if (policy['payer_type_label'] && policy['payer_type_label'].length > 0)
        insurance_types.push(policy['payer_type_label']);
      if (policy['insurance_type_label'] && policy['insurance_type_label'].length > 0)
        insurance_types.push(policy['insurance_type_label']);

      $("<td/>", {text: insurance_types.join(" - ")}).appendTo(row);
      $("<td/>", {text: policy['coverage_description']}).appendTo(row);
      $("<td/>", {html: that.coverage.parseReference(policy['reference']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseContactDetails(policy['contact_details']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: this.coverage.parseDates(policy['dates']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: this.coverage.parseComments(policy['comments']).join("<br/>")}).appendTo(row);
    });

    return(table);
  };

  // Build Maximum, Minimum and Deductible for plan
  this.buildMaximumMinimumDeductibles = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    $("<th/>", {colSpan: 2, text: ""}).appendTo(rowHead);
    $("<th/>", {colSpan: 4, text: "Individual"}).addClass("text-center right-grey-border left-grey-border").appendTo(rowHead);
    $("<th/>", {colSpan: 4, text: "Family"}).addClass("text-center right-grey-border").appendTo(rowHead);

    $("<th/>", {text: "Network"}).appendTo(rowHead2);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);
    $("<th/>", {text: "Deductible"}).addClass("left-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Deductible Remaining"}).appendTo(rowHead2);
    $("<th/>", {text: "Maximum"}).appendTo(rowHead2);
    $("<th/>", {text: "Maximum Remaining"}).addClass("right-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Deductible"}).appendTo(rowHead2);
    $("<th/>", {text: "Deductible Remaining"}).appendTo(rowHead2);
    $("<th/>", {text: "Maximum"}).appendTo(rowHead2);
    $("<th/>", {text: "Maximum Remaining"}).addClass("right-grey-border").appendTo(rowHead2);

    var rows = new Array();

    $.each(data, function (key) {
      var item = data[key];

      if (key == 'deductible') {
        // In Network Deductible Totals
        if (item['totals'] && item['totals']['in_network'] && item['totals']['in_network'].length > 0) {
          $.each(item['totals']['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 2, 6);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // In Network Deductible Remaining
        if (item['remainings'] && item['remainings']['in_network'] && item['remainings']['in_network'].length > 0) {
          $.each(item['remainings']['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 3, 7);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }

        // Out Network Deductible Totals
        if (item['totals'] && item['totals']['out_network'] && item['totals']['out_network'].length > 0) {
          $.each(item['totals']['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 2, 6);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // Out Network Deductible Remaining
        if (item['remainings'] && item['remainings']['out_network'] && item['remainings']['out_network'].length > 0) {
          $.each(item['remainings']['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 3, 7);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
      }

      if (key == 'stop_loss') {
        // In Network Stop Loss Totals
        if (item['totals'] && item['totals']['in_network'] && item['totals']['in_network'].length > 0) {
          $.each(item['totals']['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 4, 8);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // In Network Stop Loss Remaining
        if (item['remainings'] && item['remainings']['in_network'] && item['remainings']['in_network'].length > 0) {
          $.each(item['remainings']['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 5, 9);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }

        // Out Network Stop Loss Totals
        if (item['totals'] && item['totals']['out_network'] && item['totals']['out_network'].length > 0) {
          $.each(item['totals']['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 4, 8);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // Out Network Stop Loss Remaining
        if (item['remainings'] && item['remainings']['in_network'] && item['remainings']['out_network'].length > 0) {
          $.each(item['remainings']['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, 5, 9);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", 10);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
      }
    });

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = 2; i < 10; i++) {
        if (a[i].text() != "")
          count_a += 1;
        if (b[i].text() != "")
          count_b += 1;
      }
      if (count_a < count_b) return 1;
      if (count_a > count_b) return -1;
      if (a[0].text() == "IN") return -1;
      return 0;
    }
    rows.sort(sortByContent);

    $.each(rows, function (idx, row) {
      tableBody.append($("<tr/>", {html: row}));
    });

    return(table);
  }

  // Build coinsurance table
  this.buildCoinsurance = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    $("<th/>", {colSpan: 2, text: ""}).appendTo(rowHead);
    $("<th/>", {colSpan: 2, text: "Individual"}).addClass("text-center right-grey-border left-grey-border").appendTo(rowHead);
    $("<th/>", {colSpan: 2, text: "Family"}).addClass("text-center right-grey-border").appendTo(rowHead);

    $("<th/>", {text: "Network"}).appendTo(rowHead2);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);
    $("<th/>", {text: "Period"}).addClass("left-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Amount"}).addClass("right-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Period"}).appendTo(rowHead2);
    $("<th/>", {text: "Amount"}).addClass("right-grey-border").appendTo(rowHead2);

    var rows = new Array();

    $.each(data['percents'], function (key) {
      var item = data['percents'][key];

      var text_network = '';
      if (key == 'in_network')
        text_network = 'IN';
      if (key == 'out_network')
        text_network = 'OUT';

      $.each(item, function (idx, info) {
        var level = info['level'];
        var amount = that.coverage.parseFinancialAmount(info);
        var additional_information = that.parseFinancialAdditionalInfo(info);
        var period = info['time_period_label'];
        var col_index = null;
        if (level == "INDIVIDUAL")
          col_index = 2;
        else
          col_index = 4;

        var row_idx = that.findFinancialRowIdx(rows, text_network, additional_information, col_index);
        var row = null;
        if (row_idx != null) {
          row = rows[row_idx];
        } else {
          row = that.buildFinancialEmptyRow(text_network, 6);
          rows.push(row);
        }

        row[col_index] = $("<td/>", {text: period});
        row[col_index + 1] = $("<td/>", {text: amount});

        that.addAdditionalInfoToFinancialRow(row, additional_information);
      });
    });

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = 2; i < 6; i++) {
        if (a[i].text() != "")
          count_a += 1;
        if (b[i].text() != "")
          count_b += 1;
      }
      if (count_a < count_b) return 1;
      if (count_a > count_b) return -1;
      if (a[0].text() == "IN") return -1;
      return 0;
    }
    rows.sort(sortByContent);

    $.each(rows, function (idx, row) {
      tableBody.append($("<tr/>", {html: row}));
    });

    return(table);
  }

  // Build copayment table
  this.buildCopayment = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    $("<th/>", {colSpan: 2, text: ""}).appendTo(rowHead);
    $("<th/>", {colSpan: 2, text: "Individual"}).addClass("text-center right-grey-border left-grey-border").appendTo(rowHead);
    $("<th/>", {colSpan: 2, text: "Family"}).addClass("text-center right-grey-border").appendTo(rowHead);

    $("<th/>", {text: "Network"}).appendTo(rowHead2);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);
    $("<th/>", {text: "Period"}).addClass("left-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Amount"}).addClass("right-grey-border").appendTo(rowHead2);
    $("<th/>", {text: "Period"}).appendTo(rowHead2);
    $("<th/>", {text: "Amount"}).addClass("right-grey-border").appendTo(rowHead2);

    var rows = new Array();

    $.each(data['amounts'], function (key) {
      var item = data['amounts'][key];

      var text_network = '';
      if (key == 'in_network')
        text_network = 'IN';
      if (key == 'out_network')
        text_network = 'OUT';

      $.each(item, function (idx, info) {
        var level = info['level'];
        var amount = that.coverage.parseFinancialAmount(info);
        var additional_information = that.parseFinancialAdditionalInfo(info);
        var period = info['time_period_label'];
        var col_index = null;
        if (level == "INDIVIDUAL")
          col_index = 2;
        else
          col_index = 4;

        var row_idx = that.findFinancialRowIdx(rows, text_network, additional_information, col_index);
        var row = null;
        if (row_idx != null) {
          row = rows[row_idx];
        } else {
          row = that.buildFinancialEmptyRow(text_network, 6);
          rows.push(row);
        }

        row[col_index] = $("<td/>", {text: period});
        row[col_index + 1] = $("<td/>", {text: amount});

        that.addAdditionalInfoToFinancialRow(row, additional_information);
      });
    });

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = 2; i < 6; i++) {
        if (a[i].text() != "")
          count_a += 1;
        if (b[i].text() != "")
          count_b += 1;
      }
      if (count_a < count_b) return 1;
      if (count_a > count_b) return -1;
      if (a[0].text() == "IN") return -1;
      return 0;
    }
    rows.sort(sortByContent);

    $.each(rows, function (idx, row) {
      tableBody.append($("<tr/>", {html: row}));
    });

    return(table);
  }

  // Build the disclaimer table
  this.buildDisclaimer = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
//  var tableHead = $("<thead></thead>").appendTo(table);
//  var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr/>").appendTo(tableBody);

    var disclaimer = new Array();
    $.each(data, function(idx, item) {
      disclaimer.push(item);
    });

//  $("<th/>", {text: "Disclaimer"}).appendTo(rowHead);
    $("<td/>", {html: disclaimer.join("<br>")}).appendTo(row);

    return(table);
  };


  // Returns additional information for the financial being parsed
  this.parseFinancialAdditionalInfo = function (info) {
    var additional_information = new Array();
    if (info['insurance_type_label'] && info['insurance_type_label'].length > 0) {
      additional_information.push(info['insurance_type_label']);
    }
    if (info['comments'] && info['comments'].length > 0) {
      $.each(info['comments'], function (idx, value) {
        additional_information.push(value);
      });
    }
    return(additional_information.sort());
  }

  // Returns the column index for buildMaximumDeductibles function
  this.getFinancialColIdx = function (level, individual_idx, family_idx) {
    var col_index = null;
    if (level == 'INDIVIDUAL')
      col_index = individual_idx;
    else
      col_index = family_idx;
    return(col_index);
  }

  // Iterates over the rows to see if there is a matching row with additional_information
  // and that has room for the value being added
  this.findFinancialRowIdx = function (rows, network, additional_information, col_index) {
    var ret = null;
    $.each(rows, function (row_idx, row) {
      if (row[1].html() == additional_information.join("<br>") && row[0].text() == network) {
        if (row[col_index].text() == "") {
          ret = row_idx;
        }
      }
    });
    return(ret);
  }

  // Builds an empty row for a financial table
  this.buildFinancialEmptyRow = function (network, cols) {
    var row = new Array();
    for (var i = 1; i < cols; i++) {
      row[i] = $("<td/>", {text: ""});
    }
    row[0] = $("<td/>", {text: network});
    return(row);
  }

  // Add additional information to a financial row
  this.addAdditionalInfoToFinancialRow = function (row, additional_information) {
    if ((additional_information.length > 0) && (row[1].text() == "")) {
      row[1] = $("<td/>", {html: additional_information.join("<br>")});
    }
  }

  // Returns a table with generic information about a service
  this.buildGenericFinancials = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    $("<th/>", {text: "Network"}).appendTo(rowHead);
    $("<th/>", {text: "Coverage"}).appendTo(rowHead);
    $("<th/>", {text: "Type"}).appendTo(rowHead);
    $("<th/>", {text: "Value"}).appendTo(rowHead);
    $("<th/>", {text: "Period"}).appendTo(rowHead);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead);

    // 1st In Network Individual
    rows = that.buildGenericFinancialRows(data, 'in_network', 'INDIVIDUAL');
    if (rows.length > 0) {
      $(rows[0]).addClass("warning");
      $(rows[0]).children().eq(0).text('In');
      $(rows[0]).children().eq(1).text('Individual');
      $.each(rows, function (idx, row) {
        tableBody.append(row);
      });
    }

    // 2nd In Network Family
    rows = that.buildGenericFinancialRows(data, 'in_network', 'FAMILY');
    if (rows.length > 0) {
      $(rows[0]).addClass("warning");
      $(rows[0]).children().eq(0).text('In');
      $(rows[0]).children().eq(1).text('Family');
      $.each(rows, function (idx, row) {
        tableBody.append(row);
      });
    }

    // 3rd Out Network Individual
    rows = that.buildGenericFinancialRows(data, 'out_network', 'INDIVIDUAL');
    if (rows.length > 0) {
      $(rows[0]).addClass("warning");
      $(rows[0]).children().eq(0).text('Out');
      $(rows[0]).children().eq(1).text('Individual');
      $.each(rows, function (idx, row) {
        tableBody.append(row);
      });
    }

    // 4rd Out Network Family
    rows = that.buildGenericFinancialRows(data, 'out_network', 'FAMILY');
    if (rows.length > 0) {
      $(rows[0]).addClass("warning");
      $(rows[0]).children().eq(0).text('Out');
      $(rows[0]).children().eq(1).text('Family');
      $.each(rows, function (idx, row) {
        tableBody.append(row);
      });
    }

    return(table);
  };

  this.buildGenericFinancialRows = function (data, network, level) {
    var rows = new Array();

    $.each(data, function (key) {
      var item = data[key];
      if (typeof(item) === 'object') {
        // Remainings
        if (item['remainings'] && item['remainings'][network] && item['remainings'][network].length > 0) {
          $.each(item['remainings'][network], function (idx, info) {
            if (info['level'] == level) {
              rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', info));
            }
          });
        }
        // Totals
        if (item['totals'] && item['totals'][network] && item['totals'][network].length > 0) {
          $.each(item['totals'][network], function (idx, info) {
            if (info['level'] == level) {
              rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info));
            }
          });
        }
        // Percents
        if (item['percents'] && typeof(item['percents']) === 'object') {
          // Remainings
          if (item['percents'][network] && item['percents'][network].length > 0) {
            $.each(item['percents'][network], function (idx, info) {
              if (info['level'] == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', info));
              }
            });
          }
          // Totals
          if (item['percents'][network] && item['percents'][network].length > 0) {
            $.each(item['percents'][network], function (idx, info) {
              if (info['level'] == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info));
              }
            });
          }
        }
        // Amounts
        if (item['amounts'] && typeof(item['amounts']) === 'object') {
          // Remainings
          if (item['amounts'][network] && item['amounts'][network].length > 0) {
            $.each(item['amounts'][network], function (idx, info) {
              if (info['level'] == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', info));
              }
            });
          }
          // Totals
          if (item['amounts'][network] && item['amounts'][network].length > 0) {
            $.each(item['amounts'][network], function (idx, info) {
              if (info['level'] == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info));
              }
            });
          }
        }
      }
    });

    return(rows);
  };

  this.buildGenericFinancialRow = function (network, level, type, period, item) {
    var row = $("<tr/>");
    $("<td/>").appendTo(row);
    $("<td/>").appendTo(row);

    // if (network == 'in_network')
    //   $("<td/>", {text: 'In'}).appendTo(row);
    // else
    //   $("<td/>", {text: 'Out'}).appendTo(row);
    // $("<td/>", {text: level}).appendTo(row);

    $("<td/>", {text: type}).appendTo(row);
    $("<td/>", {text: that.coverage.parseFinancialAmount(item)}).appendTo(row);
    $("<td/>", {text: period}).appendTo(row);
    var additional_information = that.parseFinancialAdditionalInfo(item);
    $("<td/>", {html: additional_information.join("</br>")}).appendTo(row);

    return(row);
  };

}

