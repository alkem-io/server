**Cherrytwist - Performance test process**

***Prerequisites***
 - [x] Installed [Jmeter](https://jmeter.apache.org/download_jmeter.cgi) application
 - [x] Stable test environment deployed on the Server (i.e. "test", "dev")
 - [x] Data populated to the Server


 ****Using Jmeter****
 - Application is installed
 - The following jmeter project is imported: **[performance-plan-ct.jmx(Jmeter)](./test/performance)**
 - In the project: 
   - There are different **disabled** suites 
   - Depending on the scenario to be performed, enable the required suite and request
   - To be able to authenticate the requests, a valid token can be taken from the web application response of any request
   - After running a particular scenario and collecting the results, clean them for the next test

****Populating environment with test data****
 - Clone the following [repository]()
 - TBD...
