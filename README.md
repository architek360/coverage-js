### Coverage.js by [Eligible] (https://www.eligibleapi.com) 

Coverage.js is a javascript library that aims to give you an easy way to get an [Eligible] (https://www.eligibleapi.com) Health Insurance Coverage and Eligibility report into your website.

### How it works

The Usage pattern is pretty simple, by using your language of choice, on your web application, you create a [Coverage] (https://eligibleapi.com/rest#retrieve-coverage) request to our endpoint, so your server side application acts like a proxy doing the request with your secret api key (you don't want to expose the secret api key on the website).

Once you get the json response, it can be included on your webpage within a hidden div, and from there you can include our js library to do a quick parsing of the response and show it to the user.

### Dependencies
Our library requires jquery to work, and the components use Twitter Bootstrap to render its styles, although you can use your own css styling if you prefer.

### Sample apps

You can check our [c# demo] (https://github.com/EligibleAPI/ASP.NET-JS-Coverage-Demo) and [rails demo] (https://github.com/eligibleapi/Rails-JS-Coverage-Demo), which shows how to make an API request on the backend and use the js library to parse the result.

Feel free to modify the library for your own usage, to contribute with new samples or enhancements to the library.

We have also prepared for you three samples that can be used out of the box, within your desktop, without the need to setup a backend or any environment setup, any browser will work:

* [Sample One] (https://github.com/EligibleAPI/js-components/blob/master/sample_1.html) is a simple example.
* [Sample Two] (https://github.com/EligibleAPI/js-components/blob/master/sample_2.html) minor customization mostly with CSS.
* [Sample Three] (https://github.com/EligibleAPI/js-components/blob/master/sample_3.html) shows a complex usage of the library.

