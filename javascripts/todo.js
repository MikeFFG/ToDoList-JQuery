$(function() {

/************************* Initialization **************************/

  var listItemTemplate = Handlebars.compile($("#list_item").html()),
      sidebarItemTemplate = Handlebars.compile($("#sidebar_list_item").html()),
      todos = { completed:[], notCompleted: [] },
      newItemOnSave = false,
      $contentTable = $("#content table"),
      $sidebar = $("#sidebar"),
      $modal = $("#modal"),
      $modal_layer = $(".modal_layer"),
      fadeDuration = 300;

  // "Init" on Window Load && Set initial selection
  $(window).on("load", function() {
    todos = JSON.parse(localStorage.getItem("todoArray")) ||
            { completed: [], notCompleted: [] };
    syncViewFromModel();
    syncSidebarList();
    $("#all_list tr")[0].click();
  });

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
    var listData = populateListData();

    setValidDueDateProp(listData);
    if (newItemOnSave === true) {
      listData.id = setUniqueID();
      addToModel(listData);
    } else {
      listData.id = +$("#hidden").val();
      updateModel(listData);
    }

    hideModal();
    syncViewFromModel();
  });

  // Mark as Complete
  $("#mark").on("click", function() {
    var todoID = +$("#hidden").val();

    if (newItemOnSave) {
      alert("Whoops! Cannot mark an unsaved item as complete!");
    } else {
      markAsComplete(todoID);
      syncViewFromModel();
      syncSidebarList();
      hideModal();
    }
  });

  // Delete Todo
  $contentTable.on("click", ".delete_item", function() {
    var $closestRow = $(this).closest("tr");

    if ($closestRow.hasClass("checked")) {
      removeFromModel("completed", $closestRow.data("id"));
    } else {
      removeFromModel("notCompleted", $closestRow.data("id"));
    }

    $closestRow.remove();
    syncViewFromModel();
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
    syncViewFromModel();
  });

  // Close modal on outside click
  $(".modal_layer").on("click", function() {
    hideModal();
  });

/************************ Model Functions ***********************/

  function addToModel(listItem) {
    if (listItem.completed) {
      todos.completed.push(listItem);
    } else {
      todos.notCompleted.push(listItem);
    }
  }

  function updateModel(listItem) {
    var todoToChange = locateToDoFromID(listItem.id);

    for (var prop in todoToChange) {
      todoToChange[prop] = listItem[prop];
    }
  }

  function removeFromModel(listString, todoID) {
    for (var i = 0; i < todos[listString].length; i++) {
      if (todos[listString][i].id === +todoID) {
        todos[listString] = sliceList(todos[listString], i);
        break;
      }
    }
  }

  function setValidDueDateProp(todo) {
    if (todo.due_month !== "Month" && todo.due_year !== "Year") {
      todo.valid_due_date = true;
    } else {
      todo.valid_due_date = false;
    }
  }

  function markAsComplete(todoID) {
    for (var i = 0; i < todos.notCompleted.length; i++) {
      if (todos.notCompleted[i].id === +todoID) {
        moveItemToCompleted(i);
        break;
      }
    }
  }

  function moveItemToCompleted(index) {
    todos.notCompleted[index].completed = true;
    todos.completed.push(todos.notCompleted[index]);
    todos.notCompleted = sliceList(todos.notCompleted, index);
  }

/************************* View Helpers **************************/

  function showModal() {
    $modal.fadeIn(fadeDuration);
    $modal_layer.fadeIn(fadeDuration);
  }

  function hideModal() {
    $modal.fadeOut(fadeDuration);
    $modal_layer.fadeOut(fadeDuration);
  }

  function addListRow(listItem) {
    $contentTable.find("tbody").append(listItemTemplate(listItem));
  }

  function syncViewFromModel() {
    var filteredList = filterList();

    $contentTable.find("tbody tr").remove();

    if (filteredList) {
      filteredList.forEach(function(todo) {
        addListRow(todo);
      });
    }

    setTitleTodoCount();
    syncSidebarList();
  }

  function syncSidebarList() {
    var allTodos = getCombinedTodoList(),
        selectedIndex = $sidebar.find("tr.selected").index("#sidebar tr");

    setSidebarCounts();
    $sidebar.find("tbody tr").remove();

    setSidebarMonthTotals(allTodos, "#all_list");
    setSidebarMonthTotals(todos.completed, "#completed_list");

    $sidebar.find("tr").eq(selectedIndex).addClass("selected");
  }

  function setTitleTodoCount() {
    var count = $("#content tbody tr").length;
    $("#title_todo_count").text(count);
  }

  function setSidebarCounts() {
    $("#all_list thead .count").text(getCombinedTodoList().length);
    $("#completed_list thead .count").text(todos.completed.length);
  }

  function setSidebarMonthTotals(list, listID) {
    var all_months = [];
    function addMonthFromTodo(todo) {
      var month = {
            due_month: todo.due_month,
            due_year: todo.due_year,
            count: 1
          };
      setDateString(month);
      if (all_months.length === 0 || !findMonthMatch(all_months, month)) {
        all_months.push(month);
      }
    }

    list.forEach(addMonthFromTodo);
    appendSidebarRows(all_months, listID);
  }

  function appendSidebarRows(all_months, listID) {
    all_months.sort(sortSidebarRows);

    all_months.forEach(function(month) {
      $(listID).find("tbody").append(sidebarItemTemplate(month));
    });
  }

  function setModalFields(todoID) {
    var todo = locateToDoFromID(todoID);
    $("#title").val(todo.title);
    $("#due_day").val(todo.due_day);
    $("#due_month").val(todo.due_month);
    $("#due_year").val(todo.due_year);
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

  function populateListData() {
    return {
      title: $("#title").val(),
      due_day: $("#due_day").val(),
      due_month: $("#due_month").val(),
      due_year: $("#due_year").val(),
      description: $("#description").val(),
      completed: false
    };
  }

/************************** Utilities **************************/

  function filterList() {
    var $selectedRow = $("tr.selected"),
        filterString = $selectedRow.find("th").eq(1).text() ||
                       $selectedRow.find("td").eq(1).text();
    function todoMatchesFilterString(todo) {
      return (todo.due_month + "/" + todo.due_year === filterString);
    }

    if (filterString === "All Todos") {
      return getCombinedTodoList();
    } else if (filterString === "Completed") {
      return todos.completed;
    } else if (filterString === "No Due Date" &&
              $selectedRow.parents("table").is("#all_list")) {
      return getCombinedTodoList().filter(todoHasInvalidDate);
    } else if (filterString === "No Due Date" &&
              $selectedRow.parents("table").is("#completed_list")) {
      return todos.completed.filter(todoHasInvalidDate);
    } else if ($selectedRow.parents("table").is("#completed_list")) {
      return todos.completed.filter(todoMatchesFilterString);
    } else {
      return getCombinedTodoList().filter(todoMatchesFilterString);
    }
  }

  function sortSidebarRows(a, b) {
    if (a.due_string === "No Due Date") { return -1; }
    if (b.due_string === "No Due Date") { return 1; }

    if (a.due_year < b.due_year) {
      return -1;
    } else if (a.due_year > b.due_year) {
      return 1;
    } else {
      if (a.due_month < b.due_month) {
        return -1;
      } else if (a.due_month > b.due_month) {
        return 1;
      }
    }
    return 0;
  }

  function findMonthMatch(all_months, month) {
    for (var i = 0; i < all_months.length; i++) {
      if (all_months[i].due_string === month.due_string) {
        all_months[i].count++;
        return true;
      }
    }
    return false;
  }

  function todoHasInvalidDate(todo) {
    return todo.valid_due_date === false;
  }

  function setDateString(month) {
    if (month.due_month !== "Month" && month.due_year !== "Year") {
      month.due_string = month.due_month + "/" + month.due_year;
    } else {
      month.due_string =  "No Due Date";
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem("todoArray", JSON.stringify(todos));
  }

  function setUniqueID() {
    var currentHighestID = -1,
        combinedTodos = getCombinedTodoList();

    combinedTodos.forEach(function(todo) {
      if (+todo.id > currentHighestID) { currentHighestID = +todo.id; }
    });

    return ++currentHighestID;
  }

  function getCombinedTodoList() {
    return todos.notCompleted.concat(todos.completed);
  }

  function locateToDoFromID(todoID) {
    var combinedTodos = getCombinedTodoList();

    for (var i = 0; i < combinedTodos.length; i++) {
      if (combinedTodos[i].id === +todoID) {
        return combinedTodos[i];
      }
    }
  }

  function sliceList(list, index) {
    return list.slice(0, index).concat(list.slice(index + 1));
  }
});
