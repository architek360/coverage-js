"use strict";

// Endpoints object for eligible
var EligibleEndpoints = {
  coverage: "https://gds.eligibleapi.com/v1.3/coverage/all.json",
  demographics: "https://gds.eligibleapi.com/v1.3/demographics/all.json"
}

var levels = [
  "individual",
  "family",
  "children only",
  "dependents only",
  "employee only",
  "spouse only",
  "spouse and children",
  "employee and spouse",
  "employee and children"
];


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
  var that = this;
  this.json = json;

  // Check if the coverage answer has any errors on it
  this.hasError = function () {
    return(this.json.error != undefined);
  }

  // Parses the errors on the coverage answer
  this.parseError = function () {
    if (this.hasError())
      return(this.json.error);
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

  // Check if the coverage answer has service providers
  this.hasServiceProviders = function() {
    if (!this.hasInsurance()) return null;
    return (this.json['insurance']['service_providers'] && this.json['insurance']['service_providers']['physicians'] &&
      this.json['insurance']['service_providers']['physicians'].length > 0)
  }

  // Return the service providers for the coverage answer
  this.getServiceProviders = function() {
    if (!this.hasServiceProviders()) return null;
    return (this.json['insurance']['service_providers']['physicians']);
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

  // Check if a json element has financials information
  this.hasFinancials = function (element) {
    return(element && element['financials'] && typeof(element['financials']) == 'object');
  }

  // Check if the plan has financials information
  this.hasPlanFinancials = function () {
    if (!this.hasPlan()) return false;
    var plan = this.json['plan'];
    return(this.hasFinancials(plan));
  }

  // Return the financials for the plan
  this.getPlanFinancials = function () {
    if (!this.hasPlanFinancials()) return null;
    return(this.json['plan']['financials']);
  }

  // Check if a json element has maximum and minimum information
  this.hasMaximumMinimum = function (stop_loss) {
    return(stop_loss && stop_loss['remainings']['in_network'].length > 0 || stop_loss['remainings']['out_network'].length > 0 ||
      stop_loss['totals']['in_network'].length > 0 || stop_loss['totals']['out_network'].length > 0);
  }

  // Check if the plan has maximum and minimums
  this.hasPlanMaximumMinimum = function () {
    if (!this.hasPlanFinancials()) return false;
    var stop_loss = this.json['plan']['financials']['stop_loss'];
    return(this.hasMaximumMinimum(stop_loss));
  }

  // Get plan maximum and minimums
  this.getPlanMaximumMinimum = function () {
    if (!this.hasPlanMaximumMinimum()) return null;
    return(this.json['plan']['financials']['stop_loss']);
  }

  // Checks if a json element has deductible information
  this.hasDeductibles = function (deductible) {
    return(deductible && deductible['remainings']['in_network'].length > 0 || deductible['remainings']['out_network'].length > 0 ||
      deductible['totals']['in_network'].length > 0 || deductible['totals']['out_network'].length > 0);
  }

  // Check if the plan has deductibles
  this.hasPlanDeductibles = function () {
    if (!this.hasPlanFinancials()) return false;
    var deductible = this.json['plan']['financials']['deductible'];
    return(this.hasDeductibles(deductible));
  }

  // Gets the plan deductibles
  this.getPlanDeductibles = function () {
    if (!this.hasPlanDeductibles()) return null;
    return(this.json['plan']['financials']['deductible']);
  }

  this.hasCoinsurance = function (coinsurance) {
    return(coinsurance && coinsurance['percents']['in_network'].length > 0 || coinsurance['percents']['out_network'].length > 0);
  }

  // Check if the plan has any coinsurance information
  this.hasPlanCoinsurance = function () {
    if (!this.hasPlanFinancials()) return false;
    var coinsurance = this.json['plan']['financials']['coinsurance'];
    return(this.hasCoinsurance(coinsurance));
  }

  // Return coinsurance for the plan
  this.getPlanCoinsurance = function () {
    if (!this.hasPlanCoinsurance()) return null;
    return(this.json['plan']['financials']['coinsurance']);
  }

  // Checks if a json element has copayment information
  this.hasCopayment = function (copayment) {
    return(copayment && copayment['in_network'].length > 0 || copayment['out_network'].length > 0);
  }

  // Check if the plan has any copayment information
  this.hasPlanCopayment = function () {
    if (!this.hasPlanFinancials()) return false;
    var copayment = this.json['plan']['financials']['copayment']['amounts'];
    return(this.hasCopayment(copayment));
  }

  // Return copayment for the plan
  this.getPlanCopayment = function () {
    if (!this.hasPlanCopayment()) return null;
    return(this.json['plan']['financials']['copayment']);
  }

  // Check if a json element has disclaimer information
  this.hasDisclaimer = function (disclaimer) {
    return(disclaimer && disclaimer.length > 0);
  }

  // Check if the plan has any disclaimer information
  this.hasPlanDisclaimer = function () {
    if (!this.hasPlanFinancials()) return false;
    var disclaimer = this.json['plan']['financials']['disclaimer'];
    return(this.hasDisclaimer(disclaimer));
  }

  // Return disclaimer information for the plan
  this.getPlanDisclaimer = function () {
    if (!this.hasPlanDisclaimer()) return null;
    return(this.json['plan']['financials']['disclaimer']);
  }

  // Check if the plan has additional insurance policies
  this.hasAdditionalInsurancePolicies = function () {
    if (!this.hasPlan()) return false;
    return(this.json['plan']['additional_insurance_policies'] && this.json['plan']['additional_insurance_policies'].length > 0);
  }

  // Check if a json element has non covered information
  this.hasNonCovered = function(noncovered) {
    return(noncovered && noncovered.length > 0);
  }

  // Check if the plan has non covered information
  this.hasPlanNonCovered = function() {
    if (this.json['plan']['exclusions'] == null) return false;
    var nonCovered = this.json['plan']['exclusions']['noncovered'];
    return(this.hasNonCovered(nonCovered));
  }

  // Check if the services has non covered information
  this.hasServicesNonCovered = function() {
    if (!this.hasServices()) return false;
    var hasNonCovered = false;
    $.each(this.json['services'], function(idx, item) {
      if (that.hasNonCovered(item['noncovered'])) {
        hasNonCovered = true;
        return false;
      }
    });
    return(hasNonCovered);
  }

  // Return the additional insurance policies for the plan
  this.getAdditionalInsurancePolicies = function () {
    if (!this.hasAdditionalInsurancePolicies()) return null;
    return(this.json['plan']['additional_insurance_policies']);
  }

  // Check if the coverage answer has a services section
  this.hasServices = function () {
    return(this.json['services'] && this.json['services'].length > 0);
  }

  // Return the services for the coverage answer
  this.getServices = function () {
    if (!this.hasServices()) return null;
    return(this.json['services']);
  }


  ///////////////////////////////////
  // Utility parsing functions below
  ///////////////////////////////////

  // Returns subscriber information within an Array
  this.parseSubscriberInfo = function (subscriber) {
    var data = new Array();
    if (subscriber['member_id'])
      data.push("Member ID: " + subscriber['member_id']);
    if (subscriber['dob'])
      data.push("DOB: " + subscriber['dob']);
    if (subscriber['group_id'])
      data.push("Group ID: " + subscriber['group_id']);
    if (subscriber['group_name'])
      data.push("Group Name: " + subscriber['group_name']);
    data = data.concat(this.parseNameAndAddress(subscriber));
    return(data);
  }

  // Parses contact details for an eligible contact
  this.parseContactDetails = function (contactDetails) {
    var list = new Array();
    $.each(contactDetails, function (index, details) {
      var detailsList = new Array();
      if ((details['first_name']) || (details['last_name'])) {
        detailsList.push(that.parseName(details));
      }
      if (details['address'] && details['address']['street_line_1']) {
        detailsList.push(that.parseAddress(details['address']));
      }
      if (details['identification_type']) {
        detailsList.push(details['identification_type'] + ': ' + details['identification_code']);
      }
      if (details['contacts'] && details['contacts'].length > 0) {
        detailsList.push(that.parseContacts(details['contacts']));
      }
      list.push(detailsList);
    });
    return(list);
  };

  // Parse eligible contacts
  this.parseContacts = function (contactData) {
    var contacts = new Array();

    $.each(contactData, function (index, contact) {
      if (that.isPresent(contact.contact_type)) {
        contacts.push(that.capitalise(contact.contact_type) + ": " + contact.contact_value);
      } else {
        contacts.push(contact.contact_value);
      }
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

    if (addressData['street_line_1'] && addressData['street_line_1']) {
      list.push(addressData['street_line_1']);
      if (addressData['street_line_2'] && addressData['street_line_2']) {
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
    if (info['amount'])
      amount = this.parseAmount(info['amount']);
    else if (info['percent'])
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

  // Capitalize a string
  this.capitalise = function (string) {
    if (this.isPresent(string))
      return(string.charAt(0).toUpperCase() + string.slice(1));
    else
      return("");
  };
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

  ///////////////////////////////////////////////////
  // Functions that adds content to a container below
  ///////////////////////////////////////////////////

  // Add a demographics section
  this.addDemographicsSection = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasDemographics()) {
      container.append(
        that.buildPanelUI('Patient',
          that.getDemographicsSection()));
    }
  }

  // Add insurance section part 1
  this.addInsuranceSection1 = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasInsurance() && that.coverage.hasDemographics()) {
      container.append(
        that.buildPanelUI('Insurance',
          that.getInsuranceSection1()));
    }
  }

  // Add insurance section part 2
  this.addInsuranceSection2 = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlan()) {
      container.append(
        that.buildPanelUI('Plan',
          that.getInsuranceSection2()));
    }
  }

  // Add insurance section part 3
  this.addInsuranceSection3 = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlan() && that.coverage.hasSubscriber()) {
      container.append(
        that.buildPanelUI('Plan',
          that.getInsuranceSection3()));
    }
  }

  // Add insurance section part 4
  this.addInsuranceSection4 = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasServiceProviders()) {
      container.append(
        that.buildPanelUI('Providers',
        that.getInsuranceSection4()));
    }
  }

  // Add plan maximum, minimum and deductibles table
  this.addPlanMaximumMinimumDeductibles = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanFinancials()) {
      container.append(
        that.buildPanelUI('Plan Maximums and Deductibles',
          that.getPlanMaximumMinimumDeductibles()));
    }
  }

  // Add plan maximum and minimum table
  this.addPlanMaximumMinimum = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanFinancials()) {
      container.append(
        that.buildPanelUI('Plan Maximums and Deductibles',
          that.getPlanMaximumMinimum()));
    }
  }

  // Add deductibles table
  this.addPlanDeductibles = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanDeductibles()) {
      container.append(
        that.buildPanelUI('Plan Maximums and Deductibles',
          that.getPlanDeductibles()));
    }
  }

  // Add coinsurance
  this.addPlanCoinsurance = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanCoinsurance()) {
      container.append(
        that.buildPanelUI('Coinsurance',
          that.getPlanCoinsurance()));
    }
  }

  // Add copayment
  this.addPlanCopayment = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanCopayment()) {
      container.append(
        that.buildPanelUI('Copayment',
          that.getPlanCopayment()));
    }
  }

  // Add disclaimer
  this.addPlanDisclaimer = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanDisclaimer()) {
      container.append(
        that.buildPanelUI('Disclaimer',
          that.getPlanDisclaimer()));
    }
  }

  // Add plan maximum and minimum table
  this.addMaximumMinimum = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasFinancials() || true) {
      container.append(
        that.buildPanelUI('Maximums',
          that.getMaximumMinimum()));
    }
  }

  // Add deductibles table
  this.addDeductibles = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanDeductibles() || true) {
      container.append(
        that.buildPanelUI('Deductibles',
          that.getDeductibles()));
    }
  }

  // Add coinsurance
  this.addCoinsurance = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanCoinsurance() || true) {
      container.append(
        that.buildPanelUI('Coinsurance',
          that.getCoinsurance()));
    }
  }

  // Add copayment
  this.addCopayment = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanCopayment() || true) {
      container.append(
        that.buildPanelUI('Copayment',
          that.getCopayment()));
    }
  }

  // Add additional insurance companies
  this.addAdditionalInsurancePolicies = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasAdditionalInsurancePolicies()) {
      container.append(
        that.buildPanelUI('Additional Insurance Policies',
          that.getAdditionalInsurancePolicies()));
    }
  }

  // Add non covered information
  this.addNonCovered = function (container) {
    container = container || this.coverageSection;
    if (that.coverage.hasPlanNonCovered() || that.coverage.hasServicesNonCovered()) {
      container.append(
        that.buildPanelUI('Non Covered',
          that.getNonCovered()));
    }
  }

  // Add all the services with generic table format
  this.addGenericServices = function (columns, container) {
    container = container || this.coverageSection;
    columns = columns || 2;

    if (that.coverage.hasServices()) {
      container.append(that.getGenericServices(columns));
    }
  }

  //////////////////////////////////////////////////////////////
  // Functions that gets the tables with parsed content below
  //////////////////////////////////////////////////////////////

  // Gets the demographic section
  this.getDemographicsSection = function () {
    return(that.buildDemographics(that.coverage.getPatient()));
  }

  // Gets the insurance section part 1
  this.getInsuranceSection1 = function () {
    return(that.buildInsuranceSection1(that.coverage.getInsurance(), that.coverage.getDemographics()));
  }

  // Gets the insurance section part 2
  this.getInsuranceSection2 = function () {
    return(that.buildInsuranceSection2(that.coverage.getPlan()));
  }

  // Gets the insurance section part 3
  this.getInsuranceSection3 = function () {
    return(that.buildInsuranceSection3(that.coverage.getPlan(), that.coverage.getSubscriber()));
  }

  // Gets the insurance section part 4
  this.getInsuranceSection4 = function () {
    return(that.buildInsuranceSection4(that.coverage.getServiceProviders()));
  }

  // Gets the plan maximum, minimum and deductibles table
  this.getPlanMaximumMinimumDeductibles = function () {
    return(that.buildMaximumMinimumDeductibles(that.coverage.getPlanFinancials()));
  }

  // Gets the plan maximum and minimum table
  this.getPlanMaximumMinimum = function () {
    return(that.buildMaximumMinimum(that.coverage.getPlanMaximumMinimum()));
  }

  // Gets the plan deductible table
  this.getPlanDeductibles = function () {
    return(that.buildDeductibles(that.coverage.getPlanDeductibles()));
  }

  // Gets the plan coinsurance table
  this.getPlanCoinsurance = function () {
    return(that.buildCoinsurance(that.coverage.getPlanCoinsurance()));
  }

  // Gets the plan copayment table
  this.getPlanCopayment = function () {
    return(that.buildCopayment(that.coverage.getPlanCopayment()));
  }

  // Gets the plan disclaimer table
  this.getPlanDisclaimer = function () {
    return(that.buildDisclaimer(that.coverage.getPlanDisclaimer()));
  }

  // Add the service column for the table header
  this.addServiceHeaderColumn = function (table) {
    $(table).find('thead').find("tr:last").prepend($("<th/>", {text: "Service"}));
    $(table).find('thead').find("tr:first").prepend($("<th/>", {text: ""}));
  }

  // Add a column to each one of the body rows
  this.prependBodyColumn = function (table, text) {
    $(table).find('tbody').find("tr").prepend($("<th/>", {text: text}));
  }

  this.sortTable = function (a, b) {
    var count_a = 0;
    var count_b = 0;
    if ($(a).find("td:nth-child(2)").text() == "IN" && $(b).find("td:nth-child(2)").text() == "OUT")
      return (-1);
    if ($(a).find("td:nth-child(2)").text() == "OUT" && $(b).find("td:nth-child(2)").text() == "IN")
      return (1);
    for (var i = 4; i < 8; i++) {
      if ($(a).find("td:nth-child(" + i + ")").text() != "")
        count_a += 1;
      if ($(b).find("td:nth-child(" + i + ")").text() != "")
        count_b += 1;
    }
    if (count_a < count_b) return 1;
    if (count_a > count_b) return -1;
    if ($(a).find("td:nth-child(2)").text() == "IN" && $(b).find("td:nth-child(2)") == "IN") return -1;
    return 0;
  }

  // Gets the maximum and minimum for the plan and services
  that.getMaximumMinimum = function () {
    var plan_stop_loss = that.coverage.getPlanMaximumMinimum();
    var services = that.coverage.getServices();
    var table = that.buildMaximumMinimum(plan_stop_loss, true, false);

    // Add the service column to the table
    this.addServiceHeaderColumn(table);
    this.prependBodyColumn(table, "Plan");

    $.each(services, function (idx, service) {
      if (that.coverage.hasFinancials(service)) {
        var stop_loss = service['financials']['stop_loss'];
        var temp_table = that.buildMaximumMinimum(stop_loss, false, false);
        that.prependBodyColumn(temp_table, service["type_label"]);
        var rows = $(temp_table).find("tbody tr");
        $(table).find('tbody').append(rows.remove());
      }
    });

    var rows = $(table).find('tbody').find('tr').remove();
    rows.sort(this.sortTable);
    $(table).find("tbody").append(rows);

    that.removeEmptyFinancialCols(3, levels.length * 2, 2, $(table).find("thead tr")[0], $(table).find("thead tr")[1], $(table).find("tbody"));

    $($(table).find("thead tr")[0]).find("th").eq(3).addClass('left-grey-border');
    $($(table).find("thead tr")[1]).find("th").eq(3).addClass('left-grey-border');

    return(table);
  }

  // Gets the Deductibles for the plan and services
  that.getDeductibles = function () {
    var plan_deductibles = that.coverage.getPlanDeductibles();
    var services = that.coverage.getServices();
    var table = that.buildDeductibles(plan_deductibles, true, false);

    // Add the service column to the table
    this.addServiceHeaderColumn(table);
    this.prependBodyColumn(table, "Plan");

    $.each(services, function (idx, service) {
      if (that.coverage.hasFinancials(service)) {
        var deductibles = service['financials']['deductible'];
        var temp_table = that.buildDeductibles(deductibles, false, false);
        that.prependBodyColumn(temp_table, service["type_label"]);
        var rows = $(temp_table).find("tbody tr");
        $(table).find('tbody').append(rows.remove());
      }
    });

    var rows = $(table).find('tbody').find('tr').remove();
    rows.sort(this.sortTable);
    $(table).find("tbody").append(rows);

    that.removeEmptyFinancialCols(3, levels.length * 2, 2, $(table).find("thead tr")[0], $(table).find("thead tr")[1], $(table).find("tbody"));

    $($(table).find("thead tr")[0]).find("th").eq(3).addClass('left-grey-border');
    $($(table).find("thead tr")[1]).find("th").eq(3).addClass('left-grey-border');

    return(table);
  }

  // Gets the coinsurance for the plan and services
  that.getCoinsurance = function () {
    var plan_coinsurance = that.coverage.getPlanCoinsurance();
    var services = that.coverage.getServices();
    var table = that.buildCoinsurance(plan_coinsurance, true, false);

    // Add the service column to the table
    this.addServiceHeaderColumn(table);
    this.prependBodyColumn(table, "Plan");

    $.each(services, function (idx, service) {
      if (that.coverage.hasFinancials(service)) {
        var coinsurance = service['financials']['coinsurance'];
        var temp_table = that.buildCoinsurance(coinsurance, false, false);
        that.prependBodyColumn(temp_table, service["type_label"]);
        var rows = $(temp_table).find("tbody tr");
        $(table).find('tbody').append(rows.remove());
      }
    });

    var rows = $(table).find('tbody').find('tr').remove();
    rows.sort(this.sortTable);
    $(table).find("tbody").append(rows);

    that.removeEmptyFinancialCols(3, levels.length * 2, 2, $(table).find("thead tr")[0], $(table).find("thead tr")[1], $(table).find("tbody"));

    $($(table).find("thead tr")[0]).find("th").eq(3).addClass('left-grey-border');
    $($(table).find("thead tr")[1]).find("th").eq(3).addClass('left-grey-border');

    return(table);
  }

  // Gets the copayment for the plan and services
  that.getCopayment = function () {
    var plan_copayment = that.coverage.getPlanCopayment();
    var services = that.coverage.getServices();
    var table = that.buildCopayment(plan_copayment, true, false);

    // Add the service column to the table
    this.addServiceHeaderColumn(table);
    this.prependBodyColumn(table, "Plan");

    $.each(services, function (idx, service) {
      if (that.coverage.hasFinancials(service)) {
        var copayment = service['financials']['copayment'];
        var temp_table = that.buildCopayment(copayment, false, false);
        that.prependBodyColumn(temp_table, service["type_label"]);
        var rows = $(temp_table).find("tbody tr");
        $(table).find('tbody').append(rows.remove());
      }
    });

    var rows = $(table).find('tbody').find('tr').remove();
    rows.sort(this.sortTable);
    $(table).find("tbody").append(rows);

    that.removeEmptyFinancialCols(3, levels.length * 2, 2, $(table).find("thead tr")[0], $(table).find("thead tr")[1], $(table).find("tbody"));

    $($(table).find("thead tr")[0]).find("th").eq(3).addClass('left-grey-border');
    $($(table).find("thead tr")[1]).find("th").eq(3).addClass('left-grey-border');

    return(table);
  }

  // Gets links to the additional insurance links
  this.getAdditionalInsuranceLinks = function () {
    var links = []

    if (that.coverage.hasAdditionalInsurancePolicies()) {
      $.each(that.coverage.getAdditionalInsurancePolicies(), function (index, policy) {
        var policy_name;
        policy_name = policy['insurance_type_label'];
        if (policy_name == null || policy_name.length <= 0) {
          policy_name = policy['coverage_description'];
        }
        if ((policy_name == null || policy_name.length <= 0) && (policy['comments'].length > 0)) {
          policy_name = policy['comments'][0];
        }
        if ((policy_name == null || policy_name.length <= 0) && (policy['contact_details'].length > 0)) {
          policy_name = policy['contact_details'][0]['last_name'] || policy['contact_details'][0]['first_name'];
        }
        if (policy_name == null || policy_name.length <= 0) {
          policy_name = "Policy #" + (index + 1);
        }
        links.push($("<a/>", {href: "#insurance-" + index, text: policy_name}));
      });
    }

    return(links);
  }

  // Gets the additional insurance companies
  this.getAdditionalInsurancePolicies = function () {
    return(that.buildAdditionalInsurancePolicies(that.coverage.getAdditionalInsurancePolicies()));
  }

  // Gets the non covered table
  this.getNonCovered = function() {
    return(that.buildNonCovered(that.coverage.getPlan(), that.coverage.getServices()));
  }

  // Gets all the services with generic table format
  this.getGenericServices = function (columns) {
    columns = columns || 2;

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
    return(master_div);
  }

  //////////////////////////////////////////////////////////////
  // Functions that builds the tables with parsing content below
  //////////////////////////////////////////////////////////////

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
    $("<td/>", {text: person['dob'] || ""}).appendTo(row);

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
    $("<td/>", {text: insurance['name'] || ""}).appendTo(row);

    $("<th/>", {text: "Insurance Type"}).appendTo(rowHead);
    $("<td/>", {text: insurance['payer_type_label'] || ""}).appendTo(row);

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
      $("<td/>", {text: demographics['dependent']['member_id'] || ""}).appendTo(row);
    else if (demographics['subscriber'] && demographics['subscriber']['member_id'] && demographics['subscriber']['member_id'].length > 0)
      $("<td/>", {text: demographics['subscriber']['member_id'] || ""}).appendTo(row);
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
    $("<td/>", {text: plan['coverage_status_label'] || ""}).addClass("coverage-status-text").appendTo(row);

    $("<th/>", {text: "Type"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_type_label'] || ""}).appendTo(row);

    $("<th/>", {text: "Plan Name"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_name'] || ""}).appendTo(row);

    $("<th/>", {text: "Plan Number"}).appendTo(rowHead);
    $("<td/>", {text: plan['plan_number'] || ""}).appendTo(row);

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
    $("<td/>", {text: subscriber['group_id'] || ""}).appendTo(row);

    $("<th/>", {text: "Group Name"}).appendTo(rowHead);
    $("<td/>", {text: subscriber['group_name'] || ""}).appendTo(row);

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

  // Build Insurance Section part 4
  this.buildInsuranceSection4 = function (physicians) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);

    $("<th/>", {text: "Type"}).appendTo(rowHead);
    $("<th/>", {text: "Primary Care"}).appendTo(rowHead);
    $("<th/>", {text: "Restricted"}).appendTo(rowHead);
    $("<th/>", {text: "Contacts"}).appendTo(rowHead);
    $("<th/>", {text: "Dates"}).appendTo(rowHead);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead);

    $.each(physicians, function(index, physician) {
      var eligibilityCodeLabel = physician['eligibility_code_label'];
      var insuranceTypeLabel = physician['insurance_type_label'];
      var primaryCare = physician['primary_care'];
      var restricted = physician['restricted'];
      var dates = physician['dates'];
      var comments = that.coverage.parseComments(physician['comments']);

      var row = $("<tr></tr>").appendTo(tableBody);

      var groupProvider = '';
      if (that.coverage.isPresent(eligibilityCodeLabel) && that.coverage.isPresent(insuranceTypeLabel)) {
        groupProvider = eligibilityCodeLabel + " - " + insuranceTypeLabel;
      } else if (that.coverage.isPresent(eligibilityCodeLabel)) {
        groupProvider = eligibilityCodeLabel;
      } else {
        groupProvider = insuranceTypeLabel;
      }

      if (physician['contact_details'] && physician['contact_details'].length > 0) {
        $.each(physician['contact_details'], function(idx, contact_detail) {
          var identificationType = contact_detail['identification_type'];
          var contacts = that.coverage.parseContacts(contact_detail['contacts']);
          var address = that.coverage.parseAddress(contact_detail['address']);

          var contactData = new Array();
          contactData.push(that.coverage.parseName(contact_detail));
          contactData.push(identificationType);
          contactData.push(contacts);
          contactData.push(address);

          $("<td/>", {text: groupProvider}).appendTo(row);
          $("<td/>", {text: (primaryCare == true ? 'Yes' : 'No')}).appendTo(row);
          $("<td/>", {text: (restricted == true ? 'Yes' : 'No')}).appendTo(row);
          $("<td/>", {html: contactData.join("<br/>")}).appendTo(row);
          $("<td/>", {html: that.coverage.parseDates(dates).join("<br/>")}).appendTo(row);
          $("<td/>", {html: comments.join("<br/>")}).appendTo(row);
        });
      } else {
        $("<td/>", {text: groupProvider}).appendTo(row);
        $("<td/>", {text: (primaryCare == true ? 'Yes' : 'No')}).appendTo(row);
        $("<td/>", {text: (restricted == true ? 'Yes' : 'No')}).appendTo(row);
        $("<td/>", {html: ""}).appendTo(row);
        $("<td/>", {html: that.coverage.parseDates(dates).join("<br/>")}).appendTo(row);
        $("<td/>", {html: comments.join("<br/>")}).appendTo(row);
      }
    });

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
      $("<td/>", {text: policy['coverage_description'] || ""}).appendTo(row);
      $("<td/>", {html: that.coverage.parseReference(policy['reference']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseContactDetails(policy['contact_details']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseDates(policy['dates']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseComments(policy['comments']).join("<br/>")}).appendTo(row);
    });

    return(table);
  };

  // Build Non Covered
  this.buildNonCovered = function(plan, services) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);

    $("<th/>", {text: "Service"}).appendTo(rowHead);
    $("<th/>", {text: "Network"}).appendTo(rowHead);
    $("<th/>", {text: "Coverage"}).appendTo(rowHead);
    $("<th/>", {text: "Time Period"}).appendTo(rowHead);
    $("<th/>", {text: "POS"}).appendTo(rowHead);
    $("<th/>", {text: "Authorization Required"}).appendTo(rowHead);
    $("<th/>", {text: "Contact"}).appendTo(rowHead);
    $("<th/>", {text: "Dates"}).appendTo(rowHead);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead);

    var parseNonCovered = function(idx, nonCovered) {
      var row = $("<tr/>").appendTo(tableBody);

      $("<td/>", {text: nonCovered['type_label']}).appendTo(row);
      $("<td/>", {text: nonCovered['level']}).appendTo(row);
      $("<td/>", {text: nonCovered['network']}).appendTo(row);
      $("<td/>", {text: nonCovered['time_period_label'] || ''}).appendTo(row);
      $("<td/>", {text: nonCovered['pos_label'] || ''}).appendTo(row);
      $("<td/>", {text: ((nonCovered['authorization_required']) ? 'Yes' : 'No')}).appendTo(row);
      $("<td/>", {html: that.coverage.parseContactDetails(nonCovered['contact_details']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseDates(nonCovered['dates']).join("<br/>")}).appendTo(row);
      $("<td/>", {html: that.coverage.parseComments(nonCovered['comments']).join("<br/>")}).appendTo(row);
    }

    if (that.coverage.hasPlanNonCovered()) {
      $.each(plan['exclusions']['noncovered'], parseNonCovered);
    }
    if (that.coverage.hasServicesNonCovered()) {
      $.each(services, function(i, item) {
        if (that.coverage.hasNonCovered(item['noncovered']))
          $.each(item['noncovered'], parseNonCovered);
      });
    }

    return(table);
  }

  // Build Maximum, Minimum and Deductible for plan
  this.buildMaximumMinimumDeductibles = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableHead = $("<thead></thead>").appendTo(table);
    var rowHead = $("<tr></tr>").appendTo(tableHead);
    var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    var financialColStart = 2;
    var numberOfCols = financialColStart + (levels.length * 4);

    $("<th/>", {text: ""}).appendTo(rowHead);
    $("<th/>", {text: ""}).appendTo(rowHead);
    $.each(levels, function(idx, keyword) {
      var title = toTitleCase(keyword);
      var col = $("<th/>", {colSpan: 4, text: title}).addClass("text-center right-grey-border").appendTo(rowHead);
    });

    $("<th/>", {text: "Network"}).appendTo(rowHead2);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);

    $.each(levels, function(idx, keyword) {
      $("<th/>", {text: "Deductible"}).appendTo(rowHead2);
      $("<th/>", {text: "Deductible Remaining"}).appendTo(rowHead2);
      $("<th/>", {text: "Maximum"}).appendTo(rowHead2);
      $("<th/>", {text: "Maximum Remaining"}).addClass("right-grey-border").appendTo(rowHead2);
    });

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

            var col_index = that.getFinancialColIdx(level, financialColStart, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart + 2, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart + 3, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
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

            var col_index = that.getFinancialColIdx(level, financialColStart + 2, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // Out Network Stop Loss Remaining
        if (item['remainings'] && item['remainings']['out_network'] && item['remainings']['out_network'].length > 0) {
          $.each(item['remainings']['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart + 3, 4);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
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
      for (var i = financialColStart; i < numberOfCols; i++) {
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

    this.removeEmptyFinancialCols(financialColStart, numberOfCols, 4, rowHead, rowHead2, tableBody);

    // Add the left border class to the headers
    $(rowHead).find("th").eq(financialColStart).addClass('left-grey-border');
    $(rowHead2).find("th").eq(financialColStart).addClass('left-grey-border');

    return(table);
  }

  // Build Deductible for plan/service
  this.buildDeductibles = function (data, headers, removeEmptyColumns) {
    if (headers != false) headers = true;
    if (removeEmptyColumns != false) removeEmptyColumns = true;
    var table = $("<table class=\"table table-hover\"/>");
    if (headers) {
      var tableHead = $("<thead></thead>").appendTo(table);
      var rowHead = $("<tr></tr>").appendTo(tableHead);
      var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    }
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    var financialColStart = 2;
    var numberOfCols = financialColStart + (levels.length * 2);

    if (headers) {
      $("<th/>", {text: ""}).appendTo(rowHead);
      $("<th/>", {text: ""}).appendTo(rowHead);

      $.each(levels, function(idx, keyword) {
        var title = toTitleCase(keyword);
        var col = $("<th/>", {colSpan: 2, text: title}).addClass("text-center right-grey-border").appendTo(rowHead);
      });

      $("<th/>", {text: "Network"}).appendTo(rowHead2);
      $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);

      $.each(levels, function(idx, keyword) {
        $("<th/>", {text: "Total"}).addClass("left-grey-border").appendTo(rowHead2);
        $("<th/>", {text: "Remaining"}).addClass("right-grey-border").appendTo(rowHead2);
      });
    }

    var rows = new Array();

    if (data) {
      $.each(data, function (key, item) {

        // In Network Deductible Totals
        if (key == 'totals' && item['in_network'] && item['in_network'].length > 0) {
          $.each(item['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // In Network Deductible Remaining
        if (key == 'remainings' && item['in_network'] && item['in_network'].length > 0) {
          $.each(item['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }

        // Out Network Deductible Totals
        if (key == 'totals' && item['out_network'] && item['out_network'].length > 0) {
          $.each(item['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // Out Network Deductible Remaining
        if (key == 'remainings' && item['out_network'] && item['out_network'].length > 0) {
          $.each(item['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
      });
    }

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = financialColStart; i < numberOfCols; i++) {
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

    if (removeEmptyColumns)
      this.removeEmptyFinancialCols(financialColStart, numberOfCols, 2, rowHead, rowHead2, tableBody);

    // Add the left border class to the headers
    if (headers) {
      $(rowHead).find("th").eq(financialColStart).addClass('left-grey-border');
      $(rowHead2).find("th").eq(financialColStart).addClass('left-grey-border');
    }

    return(table);
  }

  // Build Maximum, Minimum for plan/service
  this.buildMaximumMinimum = function (data, headers, removeEmptyColumns) {
    if (headers != false) headers = true;
    if (removeEmptyColumns != false) removeEmptyColumns = true;
    var table = $("<table class=\"table table-hover\"/>");
    if (headers) {
      var tableHead = $("<thead></thead>").appendTo(table);
      var rowHead = $("<tr></tr>").appendTo(tableHead);
      var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    }
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    var financialColStart = 2;
    var numberOfCols = financialColStart + (levels.length * 2);

    if (headers) {
      $("<th/>", {text: ""}).appendTo(rowHead);
      $("<th/>", {text: ""}).appendTo(rowHead);

      $.each(levels, function(idx, keyword) {
        var title = toTitleCase(keyword);
        var col = $("<th/>", {colSpan: 2, text: title}).addClass("text-center right-grey-border").appendTo(rowHead);
      });

      $("<th/>", {text: "Network"}).appendTo(rowHead2);
      $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);

      $.each(levels, function(idx, keyword) {
        $("<th/>", {text: "Total"}).addClass("left-grey-border").appendTo(rowHead2);
        $("<th/>", {text: "Remaining"}).addClass("right-grey-border").appendTo(rowHead2);
      });
    }

    var rows = new Array();

    if (data) {

      $.each(data, function (key) {
        var item = data[key];

        // In Network Stop Loss Totals
        if (key == 'totals' && item['in_network'] && item['in_network'].length > 0) {
          $.each(item['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // In Network Stop Loss Remaining
        if (key == 'remainings' && item['in_network'] && item['in_network'].length > 0) {
          $.each(item['in_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'IN', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("IN", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }

        // Out Network Stop Loss Totals
        if (key == 'totals' && item['out_network'] && item['out_network'].length > 0) {
          $.each(item['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
        // Out Network Stop Loss Remaining
        if (key == 'remainings' && item['out_network'] && item['out_network'].length > 0) {
          $.each(item['out_network'], function (idx, info) {
            var level = info['level'];
            var amount = that.coverage.parseFinancialAmount(info);
            var additional_information = that.parseFinancialAdditionalInfo(info);

            var col_index = that.getFinancialColIdx(level, financialColStart + 1, 2);
            var row_idx = that.findFinancialRowIdx(rows, 'OUT', additional_information, col_index);
            var row = null;
            if (row_idx != null) {
              row = rows[row_idx];
            } else {
              row = that.buildFinancialEmptyRow("OUT", numberOfCols);
              rows.push(row);
            }

            row[col_index] = $("<td/>", {text: amount});

            that.addAdditionalInfoToFinancialRow(row, additional_information);
          });
        }
      });
    }

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = financialColStart; i < numberOfCols; i++) {
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

    if (removeEmptyColumns)
      this.removeEmptyFinancialCols(financialColStart, numberOfCols, 2, rowHead, rowHead2, tableBody);

    // Add the left border class to the headers
    if (headers) {
      $(rowHead).find("th").eq(financialColStart).addClass('left-grey-border');
      $(rowHead2).find("th").eq(financialColStart).addClass('left-grey-border');
    }

    return(table);
  }

  // Build coinsurance table
  this.buildCoinsurance = function (data, headers, removeEmptyColumns) {
    if (headers != false) headers = true;
    if (removeEmptyColumns != false) removeEmptyColumns = true;
    var table = $("<table class=\"table table-hover\"/>");
    if (headers) {
      var tableHead = $("<thead></thead>").appendTo(table);
      var rowHead = $("<tr></tr>").appendTo(tableHead);
      var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    }
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    var financialColStart = 2;
    var numberOfCols = financialColStart + (levels.length * 2);

    if (headers) {
      $("<th/>", {text: ""}).appendTo(rowHead);
      $("<th/>", {text: ""}).appendTo(rowHead);

      $.each(levels, function(idx, keyword) {
        var title = toTitleCase(keyword);
        var col = $("<th/>", {colSpan: 2, text: title}).addClass("text-center right-grey-border").appendTo(rowHead);
      });

      $("<th/>", {text: "Network"}).appendTo(rowHead2);
      $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);

      $.each(levels, function(idx, keyword) {
        $("<th/>", {text: "Total"}).addClass("left-grey-border").appendTo(rowHead2);
        $("<th/>", {text: "Remaining"}).addClass("right-grey-border").appendTo(rowHead2);
      });
    }

    var rows = new Array();

    if (data) {
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
          var period = info['time_period_label'] || "";

          var col_index = that.getFinancialColIdx(level, financialColStart, 2);
          var row_idx = that.findFinancialRowIdx(rows, text_network, additional_information, col_index);

          var row = null;
          if (row_idx != null) {
            row = rows[row_idx];
          } else {
            row = that.buildFinancialEmptyRow(text_network, numberOfCols);
            rows.push(row);
          }

          row[col_index] = $("<td/>", {text: period});
          row[col_index + 1] = $("<td/>", {text: amount});

          that.addAdditionalInfoToFinancialRow(row, additional_information);
        });
      });
    }

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = financialColStart; i < numberOfCols; i++) {
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

    if (removeEmptyColumns)
      this.removeEmptyFinancialCols(financialColStart, numberOfCols, 2, rowHead, rowHead2, tableBody);

    // Add the left border class to the headers
    if (headers) {
      $(rowHead).find("th").eq(financialColStart).addClass('left-grey-border');
      $(rowHead2).find("th").eq(financialColStart).addClass('left-grey-border');
    }

    return(table);
  }

  // Build copayment table
  this.buildCopayment = function (data, headers, removeEmptyColumns) {
    if (headers != false) headers = true;
    if (removeEmptyColumns != false) removeEmptyColumns = true;
    var table = $("<table class=\"table table-hover\"/>");
    if (headers) {
      var tableHead = $("<thead></thead>").appendTo(table);
      var rowHead = $("<tr></tr>").appendTo(tableHead);
      var rowHead2 = $("<tr class='warning'></tr>").appendTo(tableHead);
    }
    var tableBody = $("<tbody/>").appendTo(table);
    var rows = null;

    var financialColStart = 2;
    var numberOfCols = financialColStart + (levels.length * 2);

    if (headers) {
      $("<th/>", {text: ""}).appendTo(rowHead);
      $("<th/>", {text: ""}).appendTo(rowHead);

      $.each(levels, function(idx, keyword) {
        var title = toTitleCase(keyword);
        var col = $("<th/>", {colSpan: 2, text: title}).addClass("text-center right-grey-border").appendTo(rowHead);
      });

      $("<th/>", {text: "Network"}).appendTo(rowHead2);
      $("<th/>", {text: "Additional Information"}).appendTo(rowHead2);

      $.each(levels, function(idx, keyword) {
        $("<th/>", {text: "Period"}).addClass("left-grey-border").appendTo(rowHead2);
        $("<th/>", {text: "Amount"}).addClass("right-grey-border").appendTo(rowHead2);
      });
    }

    var rows = new Array();

    if (data) {
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
          var period = info['time_period_label'] || "";

          var col_index = that.getFinancialColIdx(level, financialColStart, 2);
          var row_idx = that.findFinancialRowIdx(rows, text_network, additional_information, col_index);

          var row = null;
          if (row_idx != null) {
            row = rows[row_idx];
          } else {
            row = that.buildFinancialEmptyRow(text_network, numberOfCols);
            rows.push(row);
          }

          row[col_index] = $("<td/>", {text: period});
          row[col_index + 1] = $("<td/>", {text: amount});

          that.addAdditionalInfoToFinancialRow(row, additional_information);
        });
      });
    }

    var sortByContent = function (a, b) {
      var count_a = 0;
      var count_b = 0;
      for (var i = financialColStart; i < numberOfCols; i++) {
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

    if (removeEmptyColumns)
      this.removeEmptyFinancialCols(financialColStart, numberOfCols, 2, rowHead, rowHead2, tableBody);

    // Add the left border class to the headers
    if (headers) {
      $(rowHead).find("th").eq(financialColStart).addClass('left-grey-border');
      $(rowHead2).find("th").eq(financialColStart).addClass('left-grey-border');
    }

    return(table);
  }

  // Build the disclaimer table
  this.buildDisclaimer = function (data) {
    var table = $("<table class=\"table table-hover\"/>");
    var tableBody = $("<tbody/>").appendTo(table);
    var row = $("<tr/>").appendTo(tableBody);

    var disclaimer = new Array();
    $.each(data, function (idx, item) {
      disclaimer.push(item);
    });

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
  this.getFinancialColIdx = function (level, financial_col_start, increment) {
    return ((levels.indexOf(level.toLowerCase()) * increment) + financial_col_start);
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

  // Removes the empty columns from the tables
  this.removeEmptyFinancialCols = function(financialColStart, numberOfCols, increment, rowHead, rowHead2, tableBody) {
    var levelsDetected = [];

    // Check those financial columns that doesn't have any value
    $.each(levels, function(idx, keyword) {
      var colIndex = (idx * increment) + financialColStart;
      var detected = false;
      $.each($(tableBody).find("tr"), function(j, row) {
        var tds = $(row).find("td");
        for (var tmp = 0; tmp < increment; tmp++) {
          if ($(tds[colIndex + tmp]).text() != "")
            detected = true;
        }
      });
      levelsDetected.push(detected);
    });

    // Mark all the cells that should be removed
    $.each(levelsDetected, function(idx, detected) {
      var colIndex = (idx * increment) + financialColStart;
      if (!detected) {
        var colsToRemove = increment - 1;
        while (colsToRemove >= 0) {
          $(tableBody).find("td:nth-child(" + (colIndex + colsToRemove + 1) + ")").attr('remove', true);
          if (rowHead2) {
            $(rowHead2).find("th").eq(colIndex + colsToRemove).attr('remove', true);
          }
          colsToRemove = colsToRemove -1;
        }
        if (rowHead) {
          $(rowHead).find("th").eq(idx + financialColStart).attr('remove', true);
        }
      }
    });

    // Remove the cells
    if (rowHead) {
      $(rowHead).find("th[remove='true']").remove();
    }
    if (rowHead2) {
      $(rowHead2).find("th[remove='true']").remove();
    }
    $(tableBody).find("td[remove='true']").remove();
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
    $("<th/>", {text: "Authorization Required"}).appendTo(rowHead);
    $("<th/>", {text: "Additional Information"}).appendTo(rowHead);

    // 1st In Network level
    $.each(levels, function(idx, level) {
      rows = that.buildGenericFinancialRows(data, 'in_network', level);
      if (rows.length > 0) {
        $(rows[0]).addClass("warning");
        $(rows[0]).children().eq(0).text('In');
        $(rows[0]).children().eq(1).text(toTitleCase(level));
        $.each(rows, function (idx, row) {
          tableBody.append(row);
        });
      }
    });

    // 2nd Out Network level
    $.each(levels, function(idx, level) {
      rows = that.buildGenericFinancialRows(data, 'out_network', level);
      if (rows.length > 0) {
        $(rows[0]).addClass("warning");
        $(rows[0]).children().eq(0).text('Out');
        $(rows[0]).children().eq(1).text(toTitleCase(level));
        $.each(rows, function (idx, row) {
          tableBody.append(row);
        });
      }
    });

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
            if (info['level'].toLowerCase() == level) {
              rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', '-', info));
            }
          });
        }

        // Totals
        if (item['totals'] && item['totals'][network] && item['totals'][network].length > 0) {
          $.each(item['totals'][network], function (idx, info) {
            if (info['level'].toLowerCase() == level) {
              rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info['authorization_required'], info));
            }
          });
        }

        // Percents
        if (item['percents'] && typeof(item['percents']) === 'object') {
          // Remainings
          if (item['percents'][network] && item['percents'][network].length > 0) {
            $.each(item['percents'][network], function (idx, info) {
              if (info['level'].toLowerCase() == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', '-', info));
              }
            });
          }
          // Totals
          if (item['percents'][network] && item['percents'][network].length > 0) {
            $.each(item['percents'][network], function (idx, info) {
              if (info['level'].toLowerCase() == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info['authorization_required'], info));
              }
            });
          }
        }

        // Amounts
        if (item['amounts'] && typeof(item['amounts']) === 'object') {
          // Remainings
          if (item['amounts'][network] && item['amounts'][network].length > 0) {
            $.each(item['amounts'][network], function (idx, info) {
              if (info['level'].toLowerCase() == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, 'Remain', '-', info));
              }
            });
          }
          // Totals
          if (item['amounts'][network] && item['amounts'][network].length > 0) {
            $.each(item['amounts'][network], function (idx, info) {
              if (info['level'].toLowerCase() == level) {
                rows.push(that.buildGenericFinancialRow(network, level, key, info['time_period_label'], info['authorization_required'], info));
              }
            });
          }
        }
      }
    });

    return(rows);
  };

  this.buildGenericFinancialRow = function (network, level, type, period, authorization, item) {
    var row = $("<tr/>");
    $("<td/>").appendTo(row);
    $("<td/>").appendTo(row);

    $("<td/>", {text: type}).appendTo(row);
    $("<td/>", {text: that.coverage.parseFinancialAmount(item)}).appendTo(row);
    $("<td/>", {text: period}).appendTo(row);
    if (authorization === '' || authorization === true || authorization === null)
      $("<td/>", {text: 'Yes'}).appendTo(row);
    else if (authorization == '-')
      $("<td/>", {text: ''}).appendTo(row);
    else
      $("<td/>", {text: 'No'}).appendTo(row);
    var additional_information = that.parseFinancialAdditionalInfo(item);
    $("<td/>", {html: additional_information.join("</br>")}).appendTo(row);

    return(row);
  };

}


function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}