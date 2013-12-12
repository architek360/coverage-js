### Coverage.js by [Eligible] (https://www.eligibleapi.com) 

Coverage.js is a javascript library that aims to let you integrate a traditional Healthcare Eligibility and Benefit report with access to over 1000+ insurance companies into your system in less than an hour.   

### How it works

The Usage pattern is pretty simple, by using your language of choice, on your web application, you create a [Coverage] (https://eligibleapi.com/rest#retrieve-coverage) request to our endpoint, so your server side application acts like a proxy doing the request with your secret API key (you don't want to expose the secret API key on the website).

Once you get the json response, it can be included on your webpage within a hidden div, and from there you can include our js library to do a quick parsing and show your user a classic Healthcare Eligibility & Benefit report.

### Dependencies
Our library requires jquery to work, and the components use Twitter Bootstrap to render its styles, although you can use your own css styling if you prefer.


### Information contained in report

* Active / Inactive Health insurance plan status
* Plan beginning and end dates
* Plan Name and Plan type (PPO, HMO, POS, OPEN ACCESS)
* Payer type (Primary, Secondary, Medicare Part A, Medicare Advantage, Vision)
* Group/Employer information
* Deductible and Out of pocket Maximums and remaining
* Demographics for scrubbing of common data entry errors
* Coordination of benefits - for when more than one health insurance company is found per patient.
* Coinsurance, copayment, and auth information by service type. 


### Sample apps

You can check our [c# demo] (https://github.com/EligibleAPI/ASP.NET-JS-Coverage-Demo) and [rails demo] (https://github.com/eligibleapi/Rails-JS-Coverage-Demo), which shows how to make an API request on the backend and use the js library to parse the result.

Feel free to modify the library for your own usage, to contribute with new samples or enhancements to the library.

We have also prepared for you three samples that can be used out of the box, within your desktop, without the need to setup a backend or any environment setup, any browser will work:

* [Sample One] (https://github.com/EligibleAPI/js-components/blob/master/sample_1.html) is a simple example.
* [Sample Two] (https://github.com/EligibleAPI/js-components/blob/master/sample_2.html) minor customization mostly with CSS.
* [Sample Three] (https://github.com/EligibleAPI/js-components/blob/master/sample_3.html) shows a complex usage of the library.


