$(function() {

/************************* Initialization **************************/

  var todoRowTemplate = Handlebars.compile($("#todoRow").html()),
      todoListTemplate = Handlebars.compile($("#todoList").html()),
      sidebarRowTemplate = Handlebars.compile($("#sidebarRow").html()),
      sidebarListTemplate = Handlebars.compile($("#sidebarList").html()),
      newItemOnSave = false,
      $contentTable = $("#content table"),
      $sidebar = $("#sidebar"),
      $modal = $("#modal"),
      $modal_layer = $(".modal_layer"),
      fadeDuration = 300;

  // "Init" on Window Load && Set initial selection
  $(window).on("load", function() {
    Handlebars.registerPartial("todoRowTemplate", $("#todoRow").html());
    Handlebars.registerPartial("sidebarRowTemplate", $("#sidebarRow").html());
    todoList.list = JSON.parse(localStorage.getItem("todoArray")) || [];
    // sidebarList.monthLists = JSON.parse(localStorage.getItem("sidebarArray")) || {};
    syncContentView();
    $("#all_list tr")[0].click();
  });

  /************************* Objects **************************/

  function Todo(params) {
    this.completed = params.completed || false;
    this.title = params.title || "";
    this.description = params.description || "";
    this.dueDay = params.dueDay || "";
    this.dueMonth = params.dueMonth || "";
    this.dueYear = params.dueYear || "";
    this.id = params.id || setUniqueID();
  }

  Todo.prototype.monthAndYear = function() {
    if (this.validDueDate === true) {
      return this.dueMonth + "/" + this.dueYear;
    } else {
      return "No Due Date";
    }
  };

  Todo.prototype.setValidDueDateProp = function() {
    if (this.dueMonth !== "Month" && this.dueYear !== "Year") {
      this.validDueDate = true;
    } else {
      this.validDueDate = false;
    }
  };

  var todoList = {
    list: [],
    getCompleted: function() {
      return this.list.filter(function(todo) {
        return todo.completed === true;
      });
    },
    getTodo: function(todoID) {
      return this.list[todoID];
    },
    getNotCompleted: function() {
      return this.list.filter(function(todo) {
        return todo.completed === false;
      });
    },
    getFiltered: function(filter) {
      return this.list;
    },
    getSorted: function() {

    },
    addTodo: function(todo) {
      this.list.push(todo);
      sidebarList.addTodo(todo);
    },
    markAsComplete: function(todoID) {
      for (var i = 0; i < this.count(); i++) {
        if (this.list[i].id === +todoID) {
          this.list[i].completed = true;
          break;
        }
      }
    },
    markAsNotComplete: function(todoID) {
      for(var i = 0; i < this.count(); i++) {
        if (this.list[i].id === +todoID) {
          this.list[i].completed = false;
          break;
        }
      }
    },
    removeTodo: function(todoID) {
      for (var i = 0; i < this.count(); i++) {
        if (this.list[i].id === +todoID) {
          this.list = sliceList(this.list, i);
          break;
        }
      }
    },
    modifyTodo: function(todoItem) {
      var todoToChange = this.getTodo(todoItem.id);
      for (var prop in todoToChange) {
        todoToChange[prop] = todoItem[prop];
      }
    },
    count: function() {
      return this.list.length;
    }
  };

  var sidebarList = {
    monthLists: {},
    update: function() {
      // var self = this;
      // todoList.list.forEach(function(todo) {
      //   // debugger
      //   self.addTodo(todo);
      // });
    },
    addTodo: function(todo) {
      var month = todo.monthAndYear();
      if (this.monthLists[month]) {
        this.monthLists[month].push(todo);
        this.monthLists[month].count++;
      } else {
        this.monthLists[month] = [todo];
        this.monthLists[month].count = 1;
      }
    },
    removeTodo: function(todoID) {
      for (var i = 0; i < this.count(); i++) {
        if (this.monthLists[i].id === +todoID) {
          this.monthLists = sliceList(this.monthLists, i);
          break;
        }
      }
    },
    getMonth: function(month) {
      return this.monthLists[month];
    },
    getCompletedMonth: function(month) {
      return this.monthLists[month].filter(function(todo) {
        return todo.completed === true;
      });
    },
    getCompleted: function() {
      var completedMonths = {};
      for (var month in this.monthLists) {
        var completed = this.getCompletedMonth(month);
        if (completed.length !== 0) {
          completedMonths[month] = completed;
        }
      }
      return completedMonths;
    },
    count: function() {
      return todoList.count();
    },
    completedCount: function() {
      return todoList.getCompleted().length;
    }
  };

/************************* Event Handlers **************************/

  // Add Todo
  $contentTable.on("click", "th", function() {
    showModal();
    resetModalFields();
    newItemOnSave = true;
  });

  // Edit Todo
  $contentTable.on("click", ".todo_item", function() {
    var todoID = +$(this).closest("tr").data("id");
    showModal();
    setModalFields(todoID);
    newItemOnSave = false;
  });

  // Save Todo
  $("#save").on("click", function() {
    var todoItem = new Todo(getTodoDataFromModalFields());
    todoItem.setValidDueDateProp();

    if (newItemOnSave === true) {
      todoItem.id = setUniqueID();
      todoItem.completed = false;
      // debugger
      todoList.addTodo(todoItem);
    } else {
      todoItem.id = +$("#hidden").val();
      todoItem.completed = todoList.list[todoItem.id].completed;
      todoList.modifyTodo(todoItem);
    }

    hideModal();
    syncContentView();
  });

  // Mark as Complete Via Modal
  $("#mark").on("click", function() {
    var todoID = +$("#hidden").val();

    if (newItemOnSave) {
      alert("Whoops! Cannot mark an unsaved item as complete!");
    } else {
      todoList.markAsComplete(todoID);
      syncContentView();
      hideModal();
    }
  });

  // Mark as Complete Via Checkbox
  $contentTable.on("click", "tbody td:first-of-type", function() {
    var todoRow = $(this).closest("tr"),
        todoID = +todoRow.data("id");
    if (todoRow.hasClass("checked")) {
      todoList.markAsNotComplete(todoID);
      todoRow.removeClass("checked");
    } else {
      todoList.markAsComplete(todoID);
    }
    syncContentView();
  });

  // Delete Todo
  $contentTable.on("click", ".delete_item", function() {
    todoList.removeTodo($(this).closest("tr").data("id"));
    sidebarList.removeTodo($(this).closest("tr").data("id"));
    sidebarList.update();
    syncContentView();
  });

  // Window Unload
  $(window).on("unload", function() {
    saveToLocalStorage();
  });

  // Sidebar Selection
  $sidebar.on("click", "tr", function() {
    var $this = $(this),
        titleText = $this.find("th:nth-of-type(2)").text() ||
                    $this.find("td:nth-of-type(2)").text();

    $sidebar.find("tr").removeClass("selected");
    $this.addClass("selected");
    $("#list_title").html(titleText + "<em id='title_todo_count'></em>");
    syncContentView();
  });

  // Close modal on outside click
  $(".modal_layer").on("click", function() {
    hideModal();
  });

/************************* View Helpers **************************/

  function showModal() {
    $modal.fadeIn(fadeDuration);
    $modal_layer.fadeIn(fadeDuration);
  }

  function hideModal() {
    $modal.fadeOut(fadeDuration);
    $modal_layer.fadeOut(fadeDuration);
  }

  function syncContentView() {
    var filteredList = todoList.getFiltered();
    if (filteredList) {
      $contentTable.find("tbody").html(todoListTemplate({ todos: filteredList}));
    }

    setTitleCount(filteredList.length);
    sidebarList.update();
    syncSidebarList();
  }

  function setTitleCount(number) {
    $("#title_todo_count").text(number);
  }

  function syncSidebarList() {
    var selectedIndex = $sidebar.find("tr.selected").index("#sidebar tr");

    setSidebarCounts();
    $sidebar.find("tbody tr").remove();
    setSidebarMonthTotals(sidebarList.monthLists, "#all_list");
    setSidebarMonthTotals(sidebarList.getCompleted(), "#completed_list");

    $sidebar.find("tr").eq(selectedIndex).addClass("selected");
  }

  function setSidebarCounts() {
    $("#all_list thead .count").text(sidebarList.count);
    $("#completed_list thead .count").text(sidebarList.completedCount);
  }

  function setSidebarMonthTotals(list, listID) {
    var allMonths = [];
    for (var month in list) {
      var monthObject = {
        monthAndYear: month,
        count: list[month].length
      };
      allMonths.push(monthObject);
    }
    $sidebar.find(listID + " tbody").html(sidebarListTemplate({ items: allMonths}));
  }

  function setModalFields(todoID) {
    var todo = todoList.getTodo(todoID);
    $("#title").val(todo.title);
    $("#due_day").val(todo.dueDay);
    $("#due_month").val(todo.dueMonth);
    $("#due_year").val(todo.dueYear);
    $("#description").val(todo.description);
    $("#hidden").val(todo.id);
  }

  function resetModalFields() {
    $("#title").val("");
    $("#due_day").val("Day");
    $("#due_month").val("Month");
    $("#due_year").val("Year");
    $("#description").val("");
    $("#hidden").val("");
  }

  function getTodoDataFromModalFields() {
    return {
      title: $("#title").val() || "No Title",
      dueDay: $("#due_day").val(),
      dueMonth: $("#due_month").val(),
      dueYear: $("#due_year").val(),
      description: $("#description").val()
    };
  }

/************************** Utilities **************************/

  function filterList() {
    var $selectedRow = $("tr.selected"),
        filterString = $selectedRow.find("th").eq(1).text() ||
                       $selectedRow.find("td").eq(1).text();
    function todoMatchesFilterString(todo) {
      return (todo.dueMonth + "/" + todo.dueYear === filterString);
    }

    if (filterString === "All Todos") {
      return getCombinedTodoList();
    } else if (filterString === "Completed") {
      return todoList.getCompleted();
    } else if (filterString === "No Due Date" &&
              $selectedRow.parents("table").is("#all_list")) {
      return getCombinedTodoList().filter(todoHasInvalidDate);
    } else if (filterString === "No Due Date" &&
              $selectedRow.parents("table").is("#completed_list")) {
      return todoList.getCompleted().filter(todoHasInvalidDate);
    } else if ($selectedRow.parents("table").is("#completed_list")) {
      return todoList.getCompleted().filter(todoMatchesFilterString);
    } else {
      return getCombinedTodoList().filter(todoMatchesFilterString);
    }
  }

  function sortSidebarRows(a, b) {
    if (a.dueString === "No Due Date") { return -1; }
    if (b.dueString === "No Due Date") { return 1; }

    if (a.dueYear < b.dueYear) {
      return -1;
    } else if (a.dueYear > b.dueYear) {
      return 1;
    } else {
      if (a.dueMonth < b.dueMonth) {
        return -1;
      } else if (a.dueMonth > b.dueMonth) {
        return 1;
      }
    }
    return 0;
  }

  function findMonthMatch(allMonths, month) {
    for (var i = 0; i < allMonths.length; i++) {
      if (allMonths[i].dueString === month.dueString) {
        allMonths[i].count++;
        return true;
      }
    }
    return false;
  }

  function todoHasInvalidDate(todo) {
    return todo.validDueDate === false;
  }

  function setDateString(month) {
    if (month.dueMonth !== "Month" && month.dueYear !== "Year") {
      month.dueString = month.dueMonth + "/" + month.dueYear;
    } else {
      month.dueString =  "No Due Date";
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem("todoArray", JSON.stringify(todoList.list));
    // localStorage.setItem("sidebarArray", JSON.stringify(sidebarList.monthLists));
  }

  function setUniqueID() {
    if (todoList.list.length !== 0) {
      return todoList.list[todoList.list.length - 1].id + 1;
    } else {
      return 0;
    }
  }

  function getCombinedTodoList() {
    return todoList.list;
  }

  function sliceList(list, index) {
    return list.slice(0, index).concat(list.slice(index + 1));
  }
});
