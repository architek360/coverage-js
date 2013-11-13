var type_watch = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  }
})();

(function($) {
  var re = /([^&=]+)=?([^&]*)/g;
  var decodeRE = /\+/g; // Regex for replacing addition symbol with a space
  var decode = function (str) {return decodeURIComponent( str.replace(decodeRE, " ") );};
  $.parseParams = function(query) {
    var params = {}, e;
    while ( e = re.exec(query) ) {
      var k = decode( e[1] ), v = decode( e[2] );
      if (k.substring(k.length - 2) === '[]') {
        k = k.substring(0, k.length - 2);
        (params[k] || (params[k] = [])).push(v);
      }
      else params[k] = v;
    }
    return params;
  };
})(jQuery);

var autocomplete_fields = function() {
  var url = $("#test_url").val();
  data = $.parseParams(url.split('?')[1] || '' );

  var api_key = data['api_key'] || data['APIKey'];
  var payer_id = data['payer_id'] || data['PayerID'];
  var service_provider_npi = data['service_provider_npi'] || data['DoctorNPI'];
  var service_provider_last_name = data['service_provider_last_name'] || data['DoctorLastName'];
  var service_provider_first_name = data['service_provider_first_name'] || data['DoctorFirstName'];
  var subscriber_id = data['subscriber_id'] || data['InsureeMemberID'] || data['SubscriberMemberID'];
  var subscriber_last_name = data['subscriber_last_name'] || data['InsureeLastName'] || data['SubscriberLastName'];
  var subscriber_first_name = data['subscriber_first_name'] || data['InsureeFirstName'] || data['SubscriberFirstName'];
  var subscriber_dob = data['subscriber_dob'] || data['InsureeDOB'] || data['SubscriberDOB'];

  try {
    if (api_key.length > 0) $("#api_key").val(api_key);
    if (payer_id.length > 0) $("#payer_id").val(payer_id);
    if (service_provider_npi.length > 0) $("#provider_npi").val(service_provider_npi);
    if (service_provider_last_name.length > 0) $("#provider_last_name").val(service_provider_last_name);
    if (service_provider_first_name.length > 0) $("#provider_first_name").val(service_provider_first_name);
    if (subscriber_id.length > 0) $("#member_id").val(subscriber_id);
    if (subscriber_last_name.length > 0) $("#member_last_name").val(subscriber_last_name);
    if (subscriber_first_name.length > 0) $("#member_first_name").val(subscriber_first_name);
    if (subscriber_dob.length > 0) $("#member_dob").val(subscriber_dob);
  } catch(ex) {
    console.log(ex);
  }
}

$(document).ready(function() {
  $("#test_url").on('keyup', function () {
    type_watch(function () {
      autocomplete_fields();
    }, 500);
  });

  autocomplete_fields();
});