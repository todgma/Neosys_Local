using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 등록/수정 창 공통 틀: 가운데 내용(스크롤), 하단 버튼(저장·삭제·닫기).
/// 저장에 성공하면 새 키를 받아 "수정" 모드로 바뀐다(기존 등록 창의 중복 등록 버그 방지). Saved는 목록 새로고침용.
/// </summary>
public abstract class EditWindow : Window
{
    protected readonly DockPanel Body = new() { LastChildFill = true };
    protected readonly StackPanel LeftButtons = new() { Orientation = Orientation.Horizontal };
    private readonly Button _save = new() { Content = "저장", MinWidth = 90 };
    private readonly Button _delete = new() { Content = "삭제", MinWidth = 80 };
    private readonly string _baseTitle;
    private readonly StackPanel _right = new() { Orientation = Orientation.Horizontal };

    public bool Changed { get; private set; }

    private readonly Border _bodyBox;

    /// <summary>내용 둘레 여백(기본 14,12,14,8 — 기존 물건폼처럼 좁게 쓰는 창은 바꾼다)</summary>
    protected Thickness BodyPadding { set => _bodyBox.Padding = value; }

    /// <summary>저장·삭제가 끝날 때마다(일반 창으로 띄운 경우 목록 새로고침용)</summary>
    public event Action? Saved;

    protected EditWindow(string baseTitle, double width = 1000, double height = 760)
    {
        _baseTitle = baseTitle;
        Width = width;
        Height = height;
        MinWidth = 640;
        MinHeight = 420;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = Application.Current.MainWindow;
        FontSize = 13;

        _save.Style = (Style)Application.Current.FindResource("PrimaryButton");
        _delete.Style = (Style)Application.Current.FindResource("DangerButton");
        var close = new Button { Content = "닫기", MinWidth = 80, IsCancel = true };

        _save.Click += async (_, _) => await SaveClickAsync();
        _delete.Click += async (_, _) => await DeleteClickAsync();
        close.Click += (_, _) => RequestClose();

        var bar = new DockPanel { Margin = new Thickness(12, 8, 12, 10) };
        var right = _right;
        right.Children.Add(_delete);
        right.Children.Add(_save);
        right.Children.Add(close);
        DockPanel.SetDock(right, Dock.Right);
        bar.Children.Add(right);
        bar.Children.Add(LeftButtons);

        var root = new DockPanel();
        DockPanel.SetDock(bar, Dock.Bottom);
        root.Children.Add(bar);
        _bodyBox = new Border { BorderBrush = (Brush)Application.Current.FindResource("Border"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(14, 12, 14, 8), Child = Body };
        root.Children.Add(_bodyBox);
        Content = root;

        Loaded += (_, _) => UpdateMode();
    }

    /// <summary>창을 띄우지 않고 내용만 다른 화면에 넣은 상태(계약관리 창의 [계약서작성] 모드)</summary>
    public bool IsEmbedded { get; private set; }

    /// <summary>삽입 상태에서 [닫기]·삭제 후 호출 — 넣은 쪽이 원래 화면으로 돌아간다</summary>
    public event Action? CloseRequested;

    /// <summary>
    /// 창 내용을 떼어 돌려준다(다른 창 안에 넣어 쓰기). 내용이 화면에 붙으면 창의 Loaded 처리(서식 읽기 등)를 한 번 실행한다.
    /// </summary>
    public FrameworkElement Embed()
    {
        var content = (FrameworkElement)Content;
        Content = null;
        IsEmbedded = true;
        RoutedEventHandler? once = null;
        once = (_, _) =>
        {
            content.Loaded -= once;
            RaiseEvent(new RoutedEventArgs(LoadedEvent, this));
        };
        content.Loaded += once;
        return content;
    }

    /// <summary>하위 대화상자의 Owner(삽입 상태면 내용을 담은 창)</summary>
    protected Window DialogOwner => IsEmbedded ? GetWindow(Body) ?? Application.Current.MainWindow : this;

    private void RequestClose()
    {
        if (IsEmbedded) CloseRequested?.Invoke();
        else Close();
    }

    /// <summary>신규 등록 상태면 true</summary>
    protected abstract bool IsNew { get; }

    /// <summary>저장 후 키를 돌려준다. 검증 실패는 InvalidOperationException 메시지로 안내된다.</summary>
    protected abstract Task SaveAsync();

    protected virtual Task DeleteAsync() => Task.CompletedTask;
    protected virtual bool CanDelete => true;

    /// <summary>삭제 확인 문구</summary>
    protected virtual string DeleteConfirm => "삭제하시겠습니까?";

    /// <summary>저장 버튼 글자(기존 물건·고객 창은 "등록 | 저장" / "수정 | 저장")</summary>
    protected virtual string SaveLabel => "저장";

    /// <summary>오른쪽 버튼 줄의 저장 버튼 앞에 버튼을 넣는다(기존 푸터: 입력초기화·소유자/임차인 변경·복사등록)</summary>
    protected void AddRightButton(Button b)
    {
        b.Margin = new Thickness(0, 0, 6, 0);
        _right.Children.Insert(_right.Children.IndexOf(_save), b);
    }

    /// <summary>저장 직후·모드 전환 시 호출(머리글 갱신 등)</summary>
    protected virtual void OnModeChanged() { }

    protected void UpdateMode()
    {
        Title = $"{_baseTitle} {(IsNew ? "등록" : "수정")}";
        _save.Content = SaveLabel;
        OnModeChanged();
        // 대표의 직원 DB 보기(읽기 전용) 중에는 저장·삭제 버튼을 숨긴다
        var viewing = AppServices.Viewing is not null;
        _save.Visibility = viewing ? Visibility.Collapsed : Visibility.Visible;
        _delete.Visibility = !IsNew && CanDelete && !viewing ? Visibility.Visible : Visibility.Collapsed;
    }

    private async Task SaveClickAsync()
    {
        _save.IsEnabled = false;
        try
        {
            // 입력 중인 칸(포커스 이동 전) 값도 반영
            (Keyboard.FocusedElement as FrameworkElement)?.MoveFocus(new TraversalRequest(FocusNavigationDirection.Next));
            await SaveAsync();
            Changed = true;
            UpdateMode();
            Saved?.Invoke();
            Dialogs.Info("저장되었습니다.");
        }
        catch (InvalidOperationException ex)
        {
            Dialogs.Warn(ex.Message);
        }
        catch (Exception ex)
        {
            Dialogs.Error("저장에 실패했습니다.\n" + ex.Message);
        }
        finally
        {
            _save.IsEnabled = true;
        }
    }

    private async Task DeleteClickAsync()
    {
        if (await ConfirmAndDeleteAsync())
        {
            Changed = true;
            Saved?.Invoke();
            RequestClose();
        }
    }

    /// <summary>삭제 확인 + 삭제. 삭제했으면 true. 선택지가 더 필요한 창은 재정의한다(예: 물건 "이력 저장 후 삭제").</summary>
    protected virtual async Task<bool> ConfirmAndDeleteAsync() =>
        Dialogs.Confirm(DeleteConfirm) && await Dialogs.RunAsync(DeleteAsync, "삭제에 실패했습니다.");
}
