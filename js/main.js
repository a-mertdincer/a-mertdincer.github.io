var before = document.getElementById("before");
var liner = document.getElementById("liner");
var command = document.getElementById("typer"); 
var textarea = document.getElementById("texter"); 
var terminal = document.getElementById("terminal");

var git = 0;
var pw = false;
let pwd = false;
var commands = [];
var passwordAttempts = 0;
var maxPasswordAttempts = 3;

setTimeout(function() {
  loopLines(banner, "", 80);
  textarea.focus();
}, 100);

window.addEventListener("keyup", enterKey);

// Make entire page clickable to focus on textarea
document.addEventListener("click", function() {
  textarea.focus();
});

// Also make terminal area clickable
terminal.addEventListener("click", function() {
  textarea.focus();
});

console.log(
  "%cYou hacked my password!😠",
  "color: #04ff00; font-weight: bold; font-size: 24px;"
);
console.log("%cPassword: '" + password + "' - I wonder what it does?🤔", "color: grey");

//init
textarea.value = "";
command.innerHTML = textarea.value;

function enterKey(e) {
  // Ctrl+L - Clear screen but keep banner
  if (e.ctrlKey && e.keyCode == 76) {
    e.preventDefault();
    setTimeout(function() {
      terminal.innerHTML = '<a id="before"></a>';
      before = document.getElementById("before");
      loopLines(banner, "", 80);
    }, 1);
    return;
  }

  if (e.keyCode == 181) {
    document.location.reload(true);
  }

  if (pw) {
    // Ctrl+C - Exit password mode
    if (e.ctrlKey && e.keyCode == 67) {
      e.preventDefault();
      addLine("^C", "error", 0);
      addLine("Password entry cancelled", "error", 100);
      command.innerHTML = "";
      textarea.value = "";
      pw = false;
      pwd = false;
      passwordAttempts = 0;
      liner.classList.remove("password");
      return;
    }

    // Handle 'exit' command in password mode
    if (e.keyCode == 13 && textarea.value.toLowerCase() === "exit") {
      addLine("Exiting password mode...", "color2", 0);
      command.innerHTML = "";
      textarea.value = "";
      pw = false;
      pwd = false;
      passwordAttempts = 0;
      liner.classList.remove("password");
      return;
    }

    let et = "*";
    let w = textarea.value.length;
    command.innerHTML = et.repeat(w);
    if (textarea.value === password) {
      pwd = true;
    }
    if (pwd && e.keyCode == 13) {
      loopLines(secret, "color2 margin", 120);
      command.innerHTML = "";
      textarea.value = "";
      pwd = false;
      pw = false;
      passwordAttempts = 0;
      liner.classList.remove("password");
    } else if (e.keyCode == 13) {
      passwordAttempts++;
      addLine("Wrong password (Attempt " + passwordAttempts + "/" + maxPasswordAttempts + ")", "error", 0);

      if (passwordAttempts >= maxPasswordAttempts) {
        addLine("Maximum attempts reached. Access denied.", "error", 100);
        command.innerHTML = "";
        textarea.value = "";
        pw = false;
        pwd = false;
        passwordAttempts = 0;
        liner.classList.remove("password");
      } else {
        addLine("Try again (or press Ctrl+C to cancel, or type 'exit')", "color2", 100);
        command.innerHTML = "";
        textarea.value = "";
      }
    }
  } else {
    if (e.keyCode == 13) {
      commands.push(command.innerHTML);
      git = commands.length;
      addLine("visitor@d0tslash.tech:~$ " + command.innerHTML, "no-animation", 0);
      commander(command.innerHTML.toLowerCase());
      command.innerHTML = "";
      textarea.value = "";
    }
    if (e.keyCode == 38 && git != 0) {
      git -= 1;
      textarea.value = commands[git];
      command.innerHTML = textarea.value;
    }
    if (e.keyCode == 40 && git != commands.length) {
      git += 1;
      if (commands[git] === undefined) {
        textarea.value = "";
      } else {
        textarea.value = commands[git];
      }
      command.innerHTML = textarea.value;
    }
  }
}

function commander(cmd) {
  switch (cmd.toLowerCase()) {
    case "help":
      loopLines(help, "color2 margin", 80);
      break;
    case "whois":
      loopLines(whois, "color2 margin", 80);
      break;
    case "whoami":
      loopLines(whoami, "color2 margin", 80);
      break;
    case "blog":
      addLine("Opening LSociety...", "color2", 80);
      newTab(blog);
      break;
    case "sudo":
      addLine("Oh no, you're not admin...", "color2", 80);
      setTimeout(function() {
        window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      }, 1000); 
      break;
    case "social":
      loopLines(social, "color2 margin", 80);
      break;
    case "secret":
      liner.classList.add("password");
      pw = true;
      break;
    case "projects":
      loopLines(projects, "color2 margin", 80);
      break;
    case "password":
      addLine("<span class=\"inherit\"> Lol! You're joking, right? You\'re gonna have to try harder than that!😂</span>", "error", 100);
      break;
    case "history":
      addLine("<br>", "", 0);
      loopLines(commands, "color2", 80);
      addLine("<br>", "command", 80 * commands.length + 50);
      break;
    case "email":
      addLine('Opening mailto:<a href="mailto:a.mertdincr@gmail.com">a.mertdincr@gmail.com</a>...', "color2", 80);
      newTab(email);
      break;
    case "clear":
      setTimeout(function() {
        terminal.innerHTML = '<a id="before"></a>';
        before = document.getElementById("before");
      }, 1);
      break;
    case "banner":
      loopLines(banner, "", 80);
      break;
    // socials
    case "twitter":
      addLine("Opening Twitter...", "color2", 0);
      newTab(twitter);
      break;
    case "linkedin":
      addLine("Opening LinkedIn...", "color2", 0);
      newTab(linkedin);
      break;
    case "github":
      addLine("Opening GitHub...", "color2", 0);
      newTab(github);
      break;
    case "certificates":
    case "certs":
      loopLines(certificates, "color2 margin", 80);
      break;
    case "experience":
    case "exp":
      loopLines(experience, "color2 margin", 80);
      break;
    case "skills":
      loopLines(skills, "color2 margin", 80);
      break;
    default:
      addLine("<span class=\"inherit\">Command not found. For a list of commands, type <span class=\"command\">'help'</span>.</span>", "error", 100);
      break;
  }
}

function newTab(link) {
  setTimeout(function() {
    window.open(link, "_blank");
  }, 500);
}

function addLine(text, style, time) {
  var t = "";
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) == " " && text.charAt(i + 1) == " ") {
      t += "&nbsp;&nbsp;";
      i++;
    } else {
      t += text.charAt(i);
    }
  }
  setTimeout(function() {
    var next = document.createElement("p");
    next.innerHTML = t;
    next.className = style;

    before.parentNode.insertBefore(next, before);

    window.scrollTo(0, document.body.offsetHeight);
  }, time);
}

function loopLines(name, style, time) {
  name.forEach(function(item, index) {
    addLine(item, style, index * time);
  });
}
