js-components
=========

Eligible JS components for quick parsing of eligible json answers.

https://www.eligibleapi.com

Eligible JS Components is a javascript library that aims to give you an easy way to get Eligible Coverage in your website.

The Usage pattern is pretty simple, by using your language of choice, on your web application, you create a Coverage request to our endpoint, so your server side application acts like a proxy doing the request with your secret api key (you don't want to expose the secret api key on the website).

Once you get the json response, it can be included on your webpage within a hidden div, and from there you can include our js library to do a quick parsing of the response and show it to the user.

You can check our c# demo at https://github.com/EligibleAPI/ASP.NET-JS-Coverage-Demo, which shows how to make an api request on the backend and use the js library to parse the result.

Feel free to modify the library for your own usage, to contribute with new samples or enhancements to the library.

Our library needs jquery to work, an the components uses Twitter Bootstrap to render its styles, although you can use your own css styles if you want.

We have prepare for you three samples that can be used out of the box, within your desktop, without the need to setup a backend or any environment setup, any browser will work:

Sample 1 is a simple example of how to use
Sample 2 still does a simple usage of the js with minor customization mostly with CSS.
Sample 3 shows a complex usage of the library

