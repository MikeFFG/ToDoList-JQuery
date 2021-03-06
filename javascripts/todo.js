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
    todoList.list = recreateListOnLoad();
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
      var filteredList;

      if (filter.filter === "All Todos") {
        filteredList = this.list;
      } else if (filter.filter === "Completed") {
        filteredList = this.getCompleted();
      } else if (filter.filter === "No Due Date" &&
                 filter.completed === false) {
        filteredList = this.list.filter(todoHasInvalidDate);
      } else if (filter.filter === "No Due Date" &&
                 filter.completed === true) {
        filteredList = this.getCompleted().filter(todoHasInvalidDate);
      } else if (filter.completed === false) {
        filteredList = this.list.filter(function(todo) {
          return (todo.dueMonth + "/" + todo.dueYear === filter.filter);
        });
      } else if (filter.completed === true) {
        filteredList = this.getCompleted().filter(function(todo) {
          return (todo.dueMonth + "/" + todo.dueYear === filter.filter);
        });
      } else {
        filteredList = this.list;
      }
      return filteredList;
    },
    addTodo: function(todo) {
      this.list.push(todo);
    },
    markAsComplete: function(todoID) {
      for (var i = 0; i < this.count(); i++) {
        if (+this.list[i].id === +todoID) {
          this.list[i].completed = true;
          break;
        }
      }
    },
    markAsNotComplete: function(todoID) {
      for(var i = 0; i < this.count(); i++) {
        if (+this.list[i].id === +todoID) {
          this.list[i].completed = false;
          break;
        }
      }
    },
    removeTodo: function(todoID) {
      for (var i = 0; i < this.count(); i++) {
        if (+this.list[i].id === +todoID) {
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
    monthLists: [],
    completedMonthLists: [],
    update: function() {
      var self = this;
      this.clearMonthLists();

      todoList.list.forEach(function(todo) {
        var month = todo.monthAndYear();

        if (!findInMonthLists(month)) {
          self.monthLists.push({
            monthAndYear: month,
            count: 1
          });
        }

        if (todo.completed) {
          if (!findInCompletedLists(month)) {
            self.completedMonthLists.push({
              monthAndYear: month,
              count: 1
            });
          }
        }
      });
    },
    clearMonthLists: function() {
      this.monthLists = [];
      this.completedMonthLists = [];
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
      todoList.addTodo(todoItem);
    } else {
      todoList.modifyTodo(todoItem);
    }

    hideModal();
    syncContentView();
  });

  // Enter Key press to save on modal
  // Need to handle edge cases
  $("#modal").keypress(function(e) {
    if (e.keyCode === 13) {
      $("#save").click();
    }
  });

  // Mark as Complete Via Modal
  $("#mark").on("click", function() {
    var todoID = +$("#hidden_id").val();

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

  function getSelectedRow() {
    var $selectedRow = $("tr.selected"),
    filterString = $selectedRow.find("th").eq(1).text() ||
                   $selectedRow.find("td").eq(1).text(),
    isCompleted;
    if ($selectedRow.parents("table").is("#all_list")) {
      isCompleted = false;
    } else {
      isCompleted = true;
    }
    return {
      filter: filterString,
      completed: isCompleted
    };
  }

  function showModal() {
    $modal.fadeIn(fadeDuration);
    $modal_layer.fadeIn(fadeDuration);
  }

  function hideModal() {
    $modal.fadeOut(fadeDuration);
    $modal_layer.fadeOut(fadeDuration);
  }

  function syncContentView() {
    var filteredList = todoList.getFiltered(getSelectedRow());
    if (filteredList) {
      $contentTable.find("tbody").html(todoListTemplate({ todos: filteredList}));
    }

    setTitleCount(filteredList.length);
    syncSidebarList();
  }

  function setTitleCount(number) {
    $("#title_todo_count").text(number);
  }

  function syncSidebarList() {
    var selectedIndex = $sidebar.find("tr.selected").index("#sidebar tr");
    sidebarList.update();
    setSidebarHeaderCounts();
    $sidebar.find("tbody tr").remove();
    setSidebarMonthTotals(sidebarList.monthLists, "#all_list");
    setSidebarMonthTotals(sidebarList.completedMonthLists, "#completed_list");

    $sidebar.find("tr").eq(selectedIndex).addClass("selected");
  }

  function setSidebarHeaderCounts() {
    $("#all_list thead .count").text(sidebarList.count);
    $("#completed_list thead .count").text(sidebarList.completedCount);
  }

  function setSidebarMonthTotals(list, listID) {
    $sidebar.find(listID + " tbody").html(sidebarListTemplate({items: list}));
  }

  function setModalFields(todoID) {
    var todo = todoList.getTodo(todoID);

    $("#title").val(todo.title);
    $("#due_day").val(todo.dueDay);
    $("#due_month").val(todo.dueMonth);
    $("#due_year").val(todo.dueYear);
    $("#description").val(todo.description);
    $("#hidden_id").val(todo.id);
    $("#hidden_completed").val(todo.completed);
  }

  function resetModalFields() {
    $("#title").val("");
    $("#due_day").val("Day");
    $("#due_month").val("Month");
    $("#due_year").val("Year");
    $("#description").val("");
    $("#hidden_id").val("");
    $("#hidden_completed").val("");
  }

  function getTodoDataFromModalFields() {
    var hidden_completed;
    if ($("#hidden_completed").val() === "true") {
      hidden_completed = true;
    } else {
      hidden_completed = false;
    }
    return {
      title: $("#title").val() || "No Title",
      dueDay: $("#due_day").val(),
      dueMonth: $("#due_month").val(),
      dueYear: $("#due_year").val(),
      description: $("#description").val(),
      id: $("#hidden_id").val(),
      completed: hidden_completed
    };
  }

/************************** Utilities **************************/
  function findInMonthLists(month) {
    var found = false;

    for (var i = 0; i < sidebarList.monthLists.length; i++) {
      if (sidebarList.monthLists[i].monthAndYear === month) {
        sidebarList.monthLists[i].count++;
        found = true;
        break;
      }
    }
    return found;
  }

  function findInCompletedLists(month) {
    var found = false;

    for (var i = 0; i < sidebarList.completedMonthLists.length; i++) {
      if (sidebarList.completedMonthLists[i].monthAndYear === month) {
        sidebarList.completedMonthLists[i].count++;
        found = true;
        break;
      }
    }
    return found;
  }

  function todoHasInvalidDate(todo) {
    return todo.validDueDate === false;
  }

  function saveToLocalStorage() {
    Lockr.set('todoList', todoList.list);
  }

  function setUniqueID() {
    if (todoList.list.length !== 0) {
      return todoList.list[todoList.list.length - 1].id + 1;
    } else {
      return 0;
    }
  }

  function recreateListOnLoad() {
    var list = Lockr.get('todoList') || [],
        todoList = [];

    list.forEach(function(todo) {
      var params = {},
          newItem;

      for (var prop in todo) {
        params[prop] = todo[prop];
      }
      newItem = new Todo(params);
      newItem.setValidDueDateProp();
      todoList.push(newItem);
    });
    return todoList;
  }

  function sliceList(list, index) {
    return list.slice(0, index).concat(list.slice(index + 1));
  }
});
