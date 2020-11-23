# checkgmail
Check gmail existence.

This checkgmail library provides the way to know the existence of gmail mailbox written in server-side JavaScript.

###Installation
Install the package with:
```
npm install checkgmail
```
### Include 
```javascript
var checkGmail = require('checkgmail');
```

### Example Using async/await
```javascript

let result = await checkGmail("abc@xyz.com"); // gmail address to test
console.log(result)  ///// status : "success" (if exists) || status : "failed" (if doesn't exists)
-- Do Something --
```

---
### Submit Queries
You can e-mail an issue/query at amansharma5@hotmail.com