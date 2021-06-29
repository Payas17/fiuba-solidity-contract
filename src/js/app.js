App = {
  web3Provider: null,
  contracts: {},
  direccionAlumno: null,

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('CursosFactory.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var CursosFactoryArtifact = data;
      App.contracts.CursosFactory = TruffleContract(CursosFactoryArtifact);

      // Set the provider for our contract
      App.contracts.CursosFactory.setProvider(App.web3Provider);

      // Use our contract to retrieve and mark the adopted pets
      return App.getCursos();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-create-course', App.toCourseForm);
    $(document).on('click', '.btn-submit', App.createCourse);
    $(document).on('click', '.btn-back', App.backToCourses);
    $(document).on('click', '.btn-students', App.toStudentForm);
    $(document).on('click', '.btn-verify', App.getStudent);
    $(document).on('click', '.btn-aprove', App.toApproveForm);
    $(document).on('click', '.btn-submit-approval', App.approveStudent);
    $(document).on('click', '.btn-modify-course', App.toModifyCourseForm);
    $(document).on('click', '.btn-remove-courses', App.removeCourses);
  },

  backToCourses: function () {
    sessionStorage.setItem('course-id', NaN)
    window.location.replace("index.html");
  },

  toApproveForm: function () {
    window.location.replace("approve_student.html");
  },

  toCourseForm: function () {
    window.location.replace("curso.html");
  },

  toModifyCourseForm: function () {
    sessionStorage.setItem('course-id', $(this).attr("data-id"));
    sessionStorage.setItem('course-nombre', $(this).attr("data-nombre"));
    sessionStorage.setItem('course-profesor', $(this).attr("data-profesor"));
    sessionStorage.setItem('course-activo', $(this).attr("data-activo"));
    sessionStorage.setItem('course-creditos', $(this).attr("data-creditos"));
    sessionStorage.setItem('course-correlativas', $(this).attr("data-correlativas"));
    window.location.replace("curso.html");  
  },

  toStudentForm: function () {
    window.location.replace("student.html");
  },

  removeCourses: function () {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      var CursosFactoryInstance;

      App.contracts.CursosFactory.deployed().then(function(instance) {
        CursosFactoryInstance = instance;
        console.log(direccionAlumno)
        return CursosFactoryInstance.removerCursadasVencidas(direccionAlumno, {from: account});
      }).then(function(student) {
        App.loadStudent(student);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  createCourse: function () {
    var name = document.getElementById("input-nombre").value;
    var profesor = document.getElementById("input-profesor").value;
    var activo = document.getElementById("input-activo").checked;
    var creditos = document.getElementById("input-creditos").value;
    var correlativas = document.getElementById("input-correlativas").value.split(",").map(
      function (el) {return parseInt(el.trim());
      });
    correlativas = correlativas.filter(function (value) {return !Number.isNaN(value);});

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      var CursosFactoryInstance;
      App.contracts.CursosFactory.deployed().then(function(instance) {
        CursosFactoryInstance = instance;
        // Execute adopt as a transaction by sending account
        var courseId = sessionStorage.getItem('course-id')
        if(!isNaN(courseId)) {
          return CursosFactoryInstance.modificarCurso(courseId, name, creditos, correlativas, activo, profesor, {from: account});
        }
        return CursosFactoryInstance.crearCurso(name, creditos, correlativas, activo, profesor, {from: account});
      }).then(function(result) {
        sessionStorage.setItem('course-id', NaN)
        window.location.replace("index.html");
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  getCursos: function() {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      var CursosFactoryInstance;

      App.contracts.CursosFactory.deployed().then(function(instance) {
        CursosFactoryInstance = instance;
        return CursosFactoryInstance.cantidadCursos();
      }).then(function(cantidadCursos) {
        var cursos_promise = [];
        for (i = 0; i < cantidadCursos; i++){
          cursos_promise.push(CursosFactoryInstance.getCurso(i))
        }
        Promise.all(cursos_promise).then( values => {
          values.forEach(curso => {
            if (curso !== '0x0000000000000000000000000000000000000000') {
               $('<tr>').html("<td>" + curso[0] + "</td><td>" 
                + curso[1] + "</td><td>" 
                + curso[2] + "</td><td>" 
                + curso[5] + "</td><td>" 
                + curso[4] + "</td><td>" 
                + curso[3] + "</td><td>"
                + '<button class="btn btn-default btn-modify-course" type="button" data-id="'+ curso[0] + '"data-nombre="'+ curso[1] + '"data-creditos="'+ curso[2] + '"data-profesor="'+ curso[5] + '"data-correlativas="'+ curso[3] + '"data-activo="'+ curso[4] + '">Modificar curso</button>' 
                + "</td>").appendTo("#cursos-table");
            }
          });
        }).catch(function(err) {
          console.log(err.message);
        });
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  getStudent: function () {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var studentAddress = document.getElementById("input-check-address").value;
      direccionAlumno = studentAddress;
      var account = accounts[0];
      var CursosFactoryInstance;

      App.contracts.CursosFactory.deployed().then(function(instance) {
        CursosFactoryInstance = instance;

        return CursosFactoryInstance.getAlumno(studentAddress);
      }).then(function(student) {
        App.loadStudent(student);
        $(".btn-remove-courses").prop("style","");
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  approveStudent: function () {
    var alumno = document.getElementById("input-address").value;
    var curso = document.getElementById("input-curso").value;
    var nota = document.getElementById("input-nota").value;
    var soloCursada = document.getElementById("input-solo-cursada").checked;
    var fecha = Date.parse(document.getElementById("input-fecha").value);
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      var CursosFactoryInstance;
      App.contracts.CursosFactory.deployed().then(function(instance) {
        CursosFactoryInstance = instance;
        // Execute adopt as a transaction by sending account
        return CursosFactoryInstance.aprobarAlumno(alumno, curso, soloCursada, nota, fecha, {from: account});
      }).then(function(result) {
        window.location.replace("student.html");
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  loadStudent: function (student) {
    $(".student-card .student-address").html("Address: "+student[0])
    $(".student-card .student-credits").html("Creditos: "+student[1])
    $(".student-card h3").html("Cursos")
    for (i = 0; i < student[2].length; i++){
      template = $(".course-card").clone()
      template.removeClass('course-card');
      template.addClass('course-card-clone')
      var fecha = new Date(student[5][i] * 1)

      template.find("p.course-id").text("Curso: " + student[2][i])
      template.find("p.course-only-cursada").text("Solo cursada: " + student[3][i])
      template.find("p.course-nota").text("Nota: " + student[4][i])
      template.find("p.course-fecha").text("Fecha: " + fecha.toISOString())
      template.appendTo(".student-card .student-courses")
    }
  }

};



$(function() {
  $(window).load(function() {
    App.init();
  });
});

function fillForm() {
  var courseId = sessionStorage.getItem('course-id')
  if(!isNaN(courseId)) {
    document.getElementById("input-nombre").value = sessionStorage.getItem('course-nombre')
    document.getElementById("input-profesor").value = sessionStorage.getItem('course-profesor');
    if(sessionStorage.getItem('course-activo') === "true"){
      document.getElementById("input-activo").checked = 1
    }
    document.getElementById("input-creditos").value = sessionStorage.getItem('course-creditos');
    document.getElementById("input-correlativas").value = sessionStorage.getItem('course-correlativas');
  }
};
