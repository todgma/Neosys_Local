using System.ComponentModel;
using System.Windows;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 같은 종류의 등록/수정 창은 하나만 — 기존 Electron(물건·고객): 열린 창이 있으면 modal.updateData로 내용만 바꾸고 포커스,
/// 신규 등록은 기존 창을 닫고 새로 열기(결과적으로 같은 창 하나). 일반 창(모달 아님)이라 목록 창과 오가며 쓴다.
/// 창 크기·크기조절 여부는 처음 넣은 등록창(EditWindow)을 따른다.
/// </summary>
public sealed class SingleWindow : Window
{
    private static readonly Dictionary<string, SingleWindow> Opened = new();
    private static readonly DependencyPropertyDescriptor TitleDescriptor = DependencyPropertyDescriptor.FromProperty(TitleProperty, typeof(Window));

    private EditWindow? _editor;
    private Action? _saved;

    private SingleWindow(string key, EditWindow first)
    {
        Width = first.Width;
        Height = first.Height;
        MinWidth = first.MinWidth;
        MinHeight = first.MinHeight;
        ResizeMode = first.ResizeMode;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        Closed += (_, _) =>
        {
            Opened.Remove(key);
            Detach();
        };
    }

    /// <summary>key 종류의 창이 열려 있으면 내용을 editor로 바꾸고 앞으로, 없으면 새로 연다. saved: 저장·삭제 후(목록 새로고침)</summary>
    public static void Show(string key, EditWindow editor, Action? saved = null)
    {
        if (!Opened.TryGetValue(key, out var w))
        {
            w = new SingleWindow(key, editor);
            Opened[key] = w;
            w.Attach(editor, saved);
            w.Show();
            return;
        }
        w.Attach(editor, saved);
        if (w.WindowState == WindowState.Minimized) w.WindowState = WindowState.Normal;
        w.Activate();
    }

    private void Attach(EditWindow editor, Action? saved)
    {
        Detach();
        _editor = editor;
        _saved = saved ?? _saved;   // 창 안에서 띄운 복사등록은 목록 새로고침을 그대로 이어받는다
        Content = editor.Embed();
        editor.Saved += OnSaved;
        editor.CloseRequested += Close;
        TitleDescriptor.AddValueChanged(editor, OnTitle);
        OnTitle(editor, EventArgs.Empty);
    }

    private void Detach()
    {
        if (_editor is null) return;
        _editor.Saved -= OnSaved;
        _editor.CloseRequested -= Close;
        TitleDescriptor.RemoveValueChanged(_editor, OnTitle);
        _editor = null;
    }

    private void OnSaved() => _saved?.Invoke();

    private void OnTitle(object? sender, EventArgs e) => Title = _editor?.Title ?? "";
}
