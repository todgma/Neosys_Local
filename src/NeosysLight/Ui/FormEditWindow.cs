using System.Windows;
using System.Windows.Controls;
using Neosys.Local.Data;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 필드 정의만으로 만드는 단순 등록/수정 창(상담·메모·협력업체·일정 등).
/// keyName = 키 컬럼. 저장 함수는 키를 돌려주고 row[keyName]에 채워져 이후 저장은 수정이 된다.
/// </summary>
public sealed class FormEditWindow : EditWindow
{
    private readonly Row _row;
    private readonly string _keyName;
    private readonly Func<Row, Task<long>> _save;
    private readonly Func<Row, Task>? _delete;

    public FormEditWindow(string title, Row row, string keyName, IEnumerable<FieldDef> fields,
        Func<Row, Task<long>> save, Func<Row, Task>? delete = null, int columns = 2, double width = 820, double height = 600,
        FrameworkElement? extra = null)
        : base(title, width, height)
    {
        _row = row;
        _keyName = keyName;
        _save = save;
        _delete = delete;

        var panel = new StackPanel();
        panel.Children.Add(FormBuilder.Build(row, fields, columns));
        if (extra is not null) panel.Children.Add(extra);
        Body.Children.Add(new ScrollViewer { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
    }

    public Row Row => _row;

    protected override bool IsNew => _row.Long(_keyName) is null or 0;

    protected override async Task SaveAsync()
    {
        var key = await _save(_row);
        _row[_keyName] = key;
    }

    protected override bool CanDelete => _delete is not null;

    protected override Task DeleteAsync() => _delete!(_row);

    /// <summary>창을 띄우고 변경 여부를 돌려준다</summary>
    public bool ShowAndReport()
    {
        ShowDialog();
        return Changed;
    }

    /// <summary>하단 왼쪽에 버튼 추가(예: 고객 선택)</summary>
    public Button AddLeftButton(string text, Action onClick)
    {
        var b = new Button { Content = text };
        b.Click += (_, _) => onClick();
        LeftButtons.Children.Add(b);
        return b;
    }
}
